import { Router, Request, Response } from "express";
import type { Knex } from "knex";
import { db } from "../../infrastructure/database/db";
import { authMiddleware } from "../middlewares/authMiddleware";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";

/**
 * Cloud & Storage monitoring (OneDrive, SharePoint, NAS, backups, ...).
 *
 * - A service holds the name and the Warning / Critical thresholds.
 * - Every reading (capacity + used, in TB) is a new row; the current figure
 *   is the newest reading, so growth and "days until full" come from history.
 * - Alerts are raised when a reading (or a threshold change) puts a service
 *   at Warning or Critical, and are resolved when it drops back. At most one
 *   alert is open per service, so a growing number does not spam the list.
 *
 * Own router; reads are open (same as /assets for now), every write needs a
 * login. Audit actions stay within Create / Edit / Delete.
 */

const router = Router();
const audit = new CreateAuditLog();

const DAY = 86400;
const STALE_DAYS = 7; // a reading older than this is flagged as stale

type Status = "healthy" | "warning" | "critical";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const emailOf = (req: Request): string =>
  (req as any).user?.email ?? "admin@local.dev";

function fail(res: Response, err: unknown, label: string): Response {
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, error: err.message });
  }
  console.error(`${label} failed:`, err);
  return res
    .status(500)
    .json({ success: false, message: `${label} failed`, error: `${label} failed` });
}

// ---------- validation helpers ----------

function cleanText(v: unknown, label: string, max: number): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new ApiError(400, `${label} must be text.`);
  const t = v.trim();
  if (t === "") return null;
  if (t.length > max) throw new ApiError(400, `${label} is too long (max ${max}).`);
  return t;
}

function requiredText(v: unknown, label: string, max: number): string {
  const t = cleanText(v, label, max);
  if (!t) throw new ApiError(400, `${label} is required.`);
  return t;
}

/** Terabytes, 2 decimals. Capacity must be > 0, used may be 0. */
function cleanTb(v: unknown, label: string, allowZero: boolean): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (
    typeof n !== "number" ||
    !Number.isFinite(n) ||
    n > 1e7 ||
    (allowZero ? n < 0 : n <= 0)
  ) {
    throw new ApiError(
      400,
      `${label} must be a number ${allowZero ? "0 or more" : "greater than 0"} (in TB).`
    );
  }
  return Math.round(n * 100) / 100;
}

function cleanPct(v: unknown, label: string, min: number, max: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new ApiError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return n;
}

function cleanCategory(v: unknown): "Cloud" | "On-premise" {
  if (v === undefined || v === null || v === "") return "Cloud";
  if (v === "Cloud" || v === "On-premise") return v;
  throw new ApiError(400, "Category must be Cloud or On-premise.");
}

/** Optional reading time (for back-filling history). Not in the future. */
function cleanWhen(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new ApiError(400, "Recorded date must be a date.");
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "Recorded date is not valid.");
  if (d.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new ApiError(400, "Recorded date cannot be in the future.");
  }
  return d;
}

function parseId(v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "Invalid id.");
  return n;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const fmt = (n: number): string => String(Number(n.toFixed(2)));

function statusOf(pct: number, warn: number, crit: number): Status {
  if (pct >= crit) return "critical";
  if (pct >= warn) return "warning";
  return "healthy";
}

// ---------- alerts ----------

/**
 * Compare the newest reading with the thresholds and bring the alerts in
 * line: resolve what no longer applies, open or refresh what does.
 */
async function evaluate(trx: Knex, serviceId: number): Promise<void> {
  const svc: any = await trx("storage_services")
    .where("id", serviceId)
    .whereNull("deleted_at")
    .first();
  if (!svc) return;

  const r: any = await trx("storage_readings")
    .where("service_id", serviceId)
    .orderBy([
      { column: "recorded_at", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .first();
  if (!r) return;

  const cap = Number(r.capacity_tb);
  const used = Number(r.used_tb);
  const pct = cap > 0 ? (used / cap) * 100 : 0;
  const level = statusOf(pct, svc.warn_pct, svc.crit_pct);

  const open: any[] = await trx("storage_alerts")
    .where("service_id", serviceId)
    .whereNull("resolved_at");

  // Anything open at a different level (or everything, once healthy) is over.
  const outdated = open.filter((a) => a.level !== level);
  if (outdated.length > 0) {
    await trx("storage_alerts")
      .whereIn("id", outdated.map((a) => a.id))
      .update({ resolved_at: trx.fn.now() });
  }
  if (level === "healthy") return;

  const threshold = level === "critical" ? svc.crit_pct : svc.warn_pct;
  const message =
    `${svc.name} is at ${Math.floor(pct)}% (${fmt(used)} of ${fmt(cap)} TB used). ` +
    `${level === "critical" ? "Critical" : "Warning"} threshold: ${threshold}%.`;

  const same = open.find((a) => a.level === level);
  if (same) {
    // Same level: keep the alert (and its acknowledgement), refresh the numbers.
    await trx("storage_alerts")
      .where("id", same.id)
      .update({ usage_pct: round2(pct), message });
  } else {
    await trx("storage_alerts").insert({
      service_id: serviceId,
      level,
      usage_pct: round2(pct),
      message,
    });
  }
}

// ---------- overview ----------

type ServiceDto = {
  id: number;
  name: string;
  provider: string | null;
  category: string;
  warnPct: number;
  critPct: number;
  notes: string | null;
  capacityTb: number;
  usedTb: number;
  availableTb: number;
  usagePct: number;
  status: Status | "unknown";
  lastReadingMs: number | null;
  ageDays: number | null;
  stale: boolean;
  trend30Tb: number | null;
  daysToFull: number | null;
  openAlerts: number;
};

function toServiceDto(s: any, readings: any[]): ServiceDto {
  const has = s.capacity_tb !== null && s.capacity_tb !== undefined;
  const cap = has ? Number(s.capacity_tb) : 0;
  const used = has ? Number(s.used_tb) : 0;
  const pct = cap > 0 ? (used / cap) * 100 : 0;

  let trend30Tb: number | null = null;
  let daysToFull: number | null = null;

  if (has && readings.length >= 2) {
    const latestTs: number = s.ts;
    const target = latestTs - 30 * DAY;
    // readings are oldest-first: the newest one at or before "30 days ago",
    // otherwise the oldest reading we have.
    let ref: any = null;
    for (const r of readings) {
      if (r.ts <= target) ref = r;
      else break;
    }
    if (!ref) ref = readings.find((r) => r.ts < latestTs) ?? null;

    if (ref) {
      const spanDays = (latestTs - ref.ts) / DAY;
      if (spanDays >= 3) {
        const perDay = (used - Number(ref.used_tb)) / spanDays;
        trend30Tb = round2(perDay * 30);
        if (perDay > 0.001) {
          if (used >= cap) daysToFull = 0;
          else {
            const d = (cap - used) / perDay;
            daysToFull = d <= 3650 ? Math.floor(d) : null;
          }
        }
      }
    }
  }

  const ageDays = s.age_sec === null || s.age_sec === undefined ? null : round2(s.age_sec / DAY);

  return {
    id: s.id,
    name: s.name,
    provider: s.provider ?? null,
    category: s.category,
    warnPct: s.warn_pct,
    critPct: s.crit_pct,
    notes: s.notes ?? null,
    capacityTb: cap,
    usedTb: used,
    availableTb: round2(Math.max(0, cap - used)),
    usagePct: round2(pct),
    status: has ? statusOf(pct, s.warn_pct, s.crit_pct) : "unknown",
    lastReadingMs: s.ts === null || s.ts === undefined ? null : Math.round(s.ts * 1000),
    ageDays,
    stale: ageDays !== null && ageDays > STALE_DAYS,
    trend30Tb,
    daysToFull,
    openAlerts: s.open_alerts ?? 0,
  };
}

const SERVICES_SQL = `
  SELECT s.*,
         r.capacity_tb,
         r.used_tb,
         EXTRACT(EPOCH FROM r.recorded_at)::float8 AS ts,
         EXTRACT(EPOCH FROM (NOW() - r.recorded_at))::float8 AS age_sec,
         (SELECT COUNT(*) FROM storage_alerts a
           WHERE a.service_id = s.id AND a.resolved_at IS NULL)::int AS open_alerts
  FROM storage_services s
  LEFT JOIN LATERAL (
    SELECT capacity_tb, used_tb, recorded_at
    FROM storage_readings
    WHERE service_id = s.id
    ORDER BY recorded_at DESC, id DESC
    LIMIT 1
  ) r ON TRUE
  WHERE s.deleted_at IS NULL`;

async function buildOverview() {
  const svc = await db.raw(SERVICES_SQL + " ORDER BY s.name, s.id");
  const rd = await db.raw(
    `SELECT service_id, used_tb, EXTRACT(EPOCH FROM recorded_at)::float8 AS ts
       FROM storage_readings
      WHERE recorded_at >= NOW() - INTERVAL '120 days'
      ORDER BY service_id, recorded_at, id`
  );

  const byService = new Map<number, any[]>();
  for (const r of rd.rows) {
    if (!byService.has(r.service_id)) byService.set(r.service_id, []);
    byService.get(r.service_id)!.push(r);
  }

  const services: ServiceDto[] = svc.rows.map((s: any) =>
    toServiceDto(s, byService.get(s.id) ?? [])
  );

  const count = (st: string) => services.filter((s) => s.status === st).length;
  const worst: Status | "unknown" =
    count("critical") > 0
      ? "critical"
      : count("warning") > 0
        ? "warning"
        : count("healthy") > 0
          ? "healthy"
          : "unknown";

  return {
    services,
    summary: {
      total: services.length,
      critical: count("critical"),
      warning: count("warning"),
      healthy: count("healthy"),
      stale: services.filter((s) => s.stale).length,
      openAlerts: services.reduce((sum, s) => sum + s.openAlerts, 0),
      worstStatus: worst,
    },
  };
}

// ---------- routes ----------

/** GET /storage/overview */
router.get("/storage/overview", async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(await buildOverview());
  } catch (err) {
    return fail(res, err, "Load storage overview");
  }
});

/** GET /storage/alerts?scope=open|all */
router.get("/storage/alerts", async (req: Request, res: Response) => {
  try {
    const onlyOpen = String(req.query.scope ?? "open") !== "all";
    const result = await db.raw(
      `SELECT a.id, a.service_id, s.name AS service_name, a.level, a.usage_pct, a.message,
              a.acknowledged_by,
              EXTRACT(EPOCH FROM a.created_at)::float8      AS created_s,
              EXTRACT(EPOCH FROM a.acknowledged_at)::float8 AS acknowledged_s,
              EXTRACT(EPOCH FROM a.resolved_at)::float8     AS resolved_s
         FROM storage_alerts a
         JOIN storage_services s ON s.id = a.service_id
        WHERE s.deleted_at IS NULL ${onlyOpen ? "AND a.resolved_at IS NULL" : ""}
        ORDER BY (a.resolved_at IS NOT NULL), (a.level = 'critical') DESC, a.created_at DESC
        LIMIT 200`
    );
    const ms = (v: number | null) => (v === null || v === undefined ? null : Math.round(v * 1000));
    return res.status(200).json(
      result.rows.map((a: any) => ({
        id: a.id,
        serviceId: a.service_id,
        serviceName: a.service_name,
        level: a.level,
        usagePct: Number(a.usage_pct),
        message: a.message,
        createdMs: ms(a.created_s),
        acknowledgedMs: ms(a.acknowledged_s),
        acknowledgedBy: a.acknowledged_by ?? null,
        resolvedMs: ms(a.resolved_s),
      }))
    );
  } catch (err) {
    return fail(res, err, "Load storage alerts");
  }
});

/** POST /storage/alerts/:id/acknowledge */
router.post(
  "/storage/alerts/:id/acknowledge",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = parseId(String(req.params.id));
      const email = emailOf(req);
      const a: any = await db("storage_alerts").where("id", id).first();
      if (!a) throw new ApiError(404, "Alert not found.");
      if (a.resolved_at) throw new ApiError(409, "This alert is already resolved.");
      if (a.acknowledged_at) throw new ApiError(409, "This alert was already acknowledged.");

      await db("storage_alerts")
        .where("id", id)
        .update({ acknowledged_at: db.fn.now(), acknowledged_by: email });

      await audit.execute(
        email,
        "Edit",
        "storage_services",
        String(a.service_id),
        { alert: "open", level: a.level },
        { alert: "acknowledged", level: a.level },
        req.ip || ""
      );
      return res.status(200).json({ success: true, message: "Alert acknowledged." });
    } catch (err) {
      return fail(res, err, "Acknowledge alert");
    }
  }
);

/** GET /storage/services/:id/readings?days=90 (newest first) */
router.get("/storage/services/:id/readings", async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const days = Math.min(730, Math.max(1, Number(req.query.days ?? 90) || 90));
    const result = await db.raw(
      `SELECT id, capacity_tb, used_tb, recorded_by, source, note,
              EXTRACT(EPOCH FROM recorded_at)::float8 AS ts
         FROM storage_readings
        WHERE service_id = ? AND recorded_at >= NOW() - (? * INTERVAL '1 day')
        ORDER BY recorded_at DESC, id DESC
        LIMIT 500`,
      [id, days]
    );
    return res.status(200).json(
      result.rows.map((r: any) => {
        const cap = Number(r.capacity_tb);
        const used = Number(r.used_tb);
        return {
          id: r.id,
          capacityTb: cap,
          usedTb: used,
          usagePct: round2(cap > 0 ? (used / cap) * 100 : 0),
          recordedMs: Math.round(r.ts * 1000),
          recordedBy: r.recorded_by ?? null,
          source: r.source,
          note: r.note ?? null,
        };
      })
    );
  } catch (err) {
    return fail(res, err, "Load readings");
  }
});

/** POST /storage/services  { name, provider?, category?, capacityTb, usedTb, warnPct?, critPct?, notes? } */
router.post("/storage/services", authMiddleware, async (req: Request, res: Response) => {
  try {
    const email = emailOf(req);
    const b = req.body ?? {};

    const name = requiredText(b.name, "Name", 120);
    const provider = cleanText(b.provider, "Provider", 120);
    const category = cleanCategory(b.category);
    const capacityTb = cleanTb(b.capacityTb, "Capacity", false);
    const usedTb = cleanTb(b.usedTb, "Used", true);
    const warnPct = cleanPct(b.warnPct ?? 80, "Warning threshold", 1, 99);
    const critPct = cleanPct(b.critPct ?? 90, "Critical threshold", 2, 100);
    const notes = cleanText(b.notes, "Notes", 2000);
    if (warnPct >= critPct) {
      throw new ApiError(400, "The warning threshold must be lower than the critical threshold.");
    }

    const dup = await db("storage_services")
      .whereNull("deleted_at")
      .whereRaw("lower(name) = lower(?)", [name])
      .first("id");
    if (dup) throw new ApiError(409, `A storage service named "${name}" already exists.`);

    const id: number = await db.transaction(async (trx) => {
      const ins: any[] = await trx("storage_services")
        .insert({
          name,
          provider,
          category,
          warn_pct: warnPct,
          crit_pct: critPct,
          notes,
          created_by: email,
          updated_by: email,
        })
        .returning("id");
      const first: any = ins[0];
      const newId: number = typeof first === "object" ? first.id : first;

      await trx("storage_readings").insert({
        service_id: newId,
        capacity_tb: capacityTb,
        used_tb: usedTb,
        recorded_by: email,
        source: "manual",
        note: "Initial reading",
      });
      await evaluate(trx, newId);
      return newId;
    });

    await audit.execute(
      email,
      "Create",
      "storage_services",
      String(id),
      null,
      { name, provider, category, capacityTb, usedTb, warnPct, critPct },
      req.ip || ""
    );
    return res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    return fail(res, err, "Create storage service");
  }
});

/** PUT /storage/services/:id  (name, provider, category, thresholds, notes) */
router.put("/storage/services/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};

    const before: any = await db("storage_services").where("id", id).whereNull("deleted_at").first();
    if (!before) throw new ApiError(404, "Storage service not found.");

    const changes: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = requiredText(b.name, "Name", 120);
      const dup = await db("storage_services")
        .whereNull("deleted_at")
        .whereNot("id", id)
        .whereRaw("lower(name) = lower(?)", [name])
        .first("id");
      if (dup) throw new ApiError(409, `A storage service named "${name}" already exists.`);
      changes.name = name;
    }
    if (b.provider !== undefined) changes.provider = cleanText(b.provider, "Provider", 120);
    if (b.category !== undefined) changes.category = cleanCategory(b.category);
    if (b.notes !== undefined) changes.notes = cleanText(b.notes, "Notes", 2000);

    const warn = b.warnPct !== undefined ? cleanPct(b.warnPct, "Warning threshold", 1, 99) : before.warn_pct;
    const crit = b.critPct !== undefined ? cleanPct(b.critPct, "Critical threshold", 2, 100) : before.crit_pct;
    if (warn >= crit) {
      throw new ApiError(400, "The warning threshold must be lower than the critical threshold.");
    }
    if (b.warnPct !== undefined) changes.warn_pct = warn;
    if (b.critPct !== undefined) changes.crit_pct = crit;

    if (Object.keys(changes).length === 0) throw new ApiError(400, "Nothing to update.");
    changes.updated_by = email;
    changes.updated_at = db.fn.now();

    await db.transaction(async (trx) => {
      await trx("storage_services").where("id", id).update(changes);
      await evaluate(trx, id); // thresholds may have moved the status
    });

    await audit.execute(
      email,
      "Edit",
      "storage_services",
      String(id),
      { name: before.name, warnPct: before.warn_pct, critPct: before.crit_pct },
      { name: changes.name ?? before.name, warnPct: warn, critPct: crit },
      req.ip || ""
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Update storage service");
  }
});

/** DELETE /storage/services/:id  (soft delete; open alerts are closed) */
router.delete("/storage/services/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const before: any = await db("storage_services").where("id", id).whereNull("deleted_at").first();
    if (!before) throw new ApiError(404, "Storage service not found.");

    await db.transaction(async (trx) => {
      await trx("storage_services")
        .where("id", id)
        .update({ deleted_at: trx.fn.now(), updated_by: email, updated_at: trx.fn.now() });
      await trx("storage_alerts")
        .where("service_id", id)
        .whereNull("resolved_at")
        .update({ resolved_at: trx.fn.now() });
    });

    await audit.execute(email, "Delete", "storage_services", String(id), { name: before.name }, null, req.ip || "");
    return res.status(200).json({ success: true, message: "Storage service deleted." });
  } catch (err) {
    return fail(res, err, "Delete storage service");
  }
});

/** POST /storage/services/:id/readings  { usedTb, capacityTb?, recordedAt?, note? } */
router.post(
  "/storage/services/:id/readings",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = parseId(String(req.params.id));
      const email = emailOf(req);
      const b = req.body ?? {};

      const usedTb = cleanTb(b.usedTb, "Used", true);
      const when = cleanWhen(b.recordedAt);
      const note = cleanText(b.note, "Note", 500);

      await db.transaction(async (trx) => {
        const svc: any = await trx("storage_services").where("id", id).whereNull("deleted_at").first();
        if (!svc) throw new ApiError(404, "Storage service not found.");

        let capacityTb: number;
        if (b.capacityTb !== undefined && b.capacityTb !== null && b.capacityTb !== "") {
          capacityTb = cleanTb(b.capacityTb, "Capacity", false);
        } else {
          const last: any = await trx("storage_readings")
            .where("service_id", id)
            .orderBy([
              { column: "recorded_at", order: "desc" },
              { column: "id", order: "desc" },
            ])
            .first("capacity_tb");
          if (!last) throw new ApiError(400, "Capacity is required for the first reading.");
          capacityTb = Number(last.capacity_tb);
        }

        const row: Record<string, unknown> = {
          service_id: id,
          capacity_tb: capacityTb,
          used_tb: usedTb,
          recorded_by: email,
          source: "manual",
          note,
        };
        if (when) row.recorded_at = when;
        await trx("storage_readings").insert(row);
        await trx("storage_services").where("id", id).update({ updated_by: email, updated_at: trx.fn.now() });

        // Alerts follow the NEWEST reading, so back-filling history is safe.
        await evaluate(trx, id);
      });

      await audit.execute(
        email,
        "Edit",
        "storage_services",
        String(id),
        null,
        { reading: { usedTb, backfilled: when !== null } },
        req.ip || ""
      );
      return res.status(201).json({ success: true });
    } catch (err) {
      return fail(res, err, "Record reading");
    }
  }
);

export default router;