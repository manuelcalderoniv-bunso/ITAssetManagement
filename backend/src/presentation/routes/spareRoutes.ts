import { Router, Request, Response } from "express";
import { db } from "../../infrastructure/database/db";
import { authMiddleware } from "../middlewares/authMiddleware";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";

/**
 * Spare Inventory (the IT Department's reserve) + two small read helpers.
 *
 *  - Tagged spares are existing assets whose status is "Available".
 *  - Stock items (mouse, cable, toner, ...) are counted in spare_items, and
 *    every change is a row in spare_movements.
 *  - A request goes Pending -> Approved -> Issued (or Rejected / Cancelled).
 *    Issuing a tagged spare sets the asset to "Issued" and puts it in the
 *    requesting department, so it lands in the right inventory.
 *
 * Own router: the asset entity / repository / controller are not touched.
 * Reads are open (same as /assets for now); every write needs a login.
 * Audit actions stay within Create / Edit / Delete.
 */

const router = Router();
const audit = new CreateAuditLog();

/** Does this kind of request need an approver before it can be issued? */
const APPROVAL_REQUIRED = {
  asset: true, // laptops, monitors, ... : IT Manager / Super Admin approves first
  stock: false, // mouse, cables, ... : IT Support can issue right away (it is logged)
};

const APPROVER_RE = /manager|admin/i;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const emailOf = (req: Request): string =>
  (req as any).user?.email ?? "admin@local.dev";

/** The role name from the login token, whichever field the token uses. */
function roleOf(req: Request): string | null {
  const u: any = (req as any).user;
  if (!u) return null;
  const raw = u.role ?? u.roleName ?? u.role_name ?? (Array.isArray(u.roles) ? u.roles[0] : undefined);
  const name = typeof raw === "string" ? raw : raw && typeof raw === "object" ? raw.name : undefined;
  return name ? String(name) : null;
}

function requireApprover(req: Request): void {
  const role = roleOf(req);
  if (!role) {
    const fields = Object.keys((req as any).user ?? {}).join(", ") || "none";
    throw new ApiError(
      403,
      `Your role could not be read from the login token (fields: ${fields}). ` +
        "Approving needs an IT Manager or Super Admin."
    );
  }
  if (!APPROVER_RE.test(role)) {
    throw new ApiError(
      403,
      `Only an IT Manager or Super Admin can do this. Your role: ${role}.`
    );
  }
}

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

function cleanInt(v: unknown, label: string, min: number, max: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new ApiError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return n;
}

function parseId(v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "Invalid id.");
  return n;
}

const stockStatus = (count: number, min: number): "ok" | "low" | "out" =>
  min > 0 && count === 0 ? "out" : min > 0 && count < min ? "low" : "ok";

// ---------- assets table helpers (columns can differ between installs) ----------

let softDeleteCol: Promise<boolean> | null = null;
const assetsHaveDeletedAt = (): Promise<boolean> => {
  if (!softDeleteCol) softDeleteCol = db.schema.hasColumn("assets", "deleted_at");
  return softDeleteCol;
};

/**
 * A query on live (not soft-deleted) assets. It is wrapped in an object on
 * purpose: returning a knex builder straight from an async function would
 * make JavaScript run it immediately (builders are thenable).
 */
async function liveAssets(trx: any = db): Promise<{ q: any }> {
  const q = trx("assets");
  if (await assetsHaveDeletedAt()) q.whereNull("deleted_at");
  return { q };
}

// ---------- read helpers ----------

/** GET /dashboard/asset-extras : department + quantity per asset (the /assets API does not return them). */
router.get("/dashboard/asset-extras", async (_req: Request, res: Response) => {
  try {
    const hasDept = await db.schema.hasColumn("assets", "department");
    const hasQty = await db.schema.hasColumn("assets", "quantity");
    const cols = ["asset_tag", ...(hasDept ? ["department"] : []), ...(hasQty ? ["quantity"] : [])];
    const { q } = await liveAssets();
    const rows: any[] = await q.select(cols);
    return res.status(200).json(
      rows.map((r) => ({
        assetTag: r.asset_tag,
        department: hasDept ? r.department ?? null : null,
        quantity: hasQty && r.quantity !== null && r.quantity !== undefined ? Number(r.quantity) : null,
      }))
    );
  } catch (err) {
    return fail(res, err, "Load asset extras");
  }
});

// ---------- overview ----------

/** GET /spare/overview */
router.get("/spare/overview", async (_req: Request, res: Response) => {
  try {
    const { q: liveQuery } = await liveAssets();
    const assets: any[] = await liveQuery
      .where("status", "Available")
      .orderBy([{ column: "asset_type" }, { column: "asset_tag" }])
      .limit(1000);
    const thresholds: any[] = await db("spare_thresholds").select("asset_type", "min_level");
    const items: any[] = await db("spare_items").whereNull("deleted_at").orderBy("name");
    const open = await db.raw(
      `SELECT status, COUNT(*)::int AS n FROM spare_requests
        WHERE status IN ('Pending', 'Approved') GROUP BY status`
    );

    const counts = new Map<string, number>();
    for (const a of assets) {
      const t = a.asset_type ?? "Unknown";
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const mins = new Map<string, number>(thresholds.map((t) => [t.asset_type, t.min_level]));
    const typeNames = [...new Set([...counts.keys(), ...mins.keys()])].sort((a, b) => a.localeCompare(b));

    const types = typeNames.map((t) => {
      const available = counts.get(t) ?? 0;
      const minLevel = mins.get(t) ?? 0;
      return { assetType: t, available, minLevel, status: stockStatus(available, minLevel) };
    });

    const stock = items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category ?? null,
      unit: i.unit,
      onHand: i.on_hand,
      minLevel: i.min_level,
      location: i.location ?? null,
      notes: i.notes ?? null,
      status: stockStatus(i.on_hand, i.min_level),
    }));

    const pending = open.rows.find((r: any) => r.status === "Pending")?.n ?? 0;
    const approved = open.rows.find((r: any) => r.status === "Approved")?.n ?? 0;
    const flagged = [...types, ...stock];

    return res.status(200).json({
      types,
      assets: assets.map((a) => ({
        assetTag: a.asset_tag,
        assetType: a.asset_type ?? null,
        manufacturer: a.manufacturer ?? null,
        model: a.model ?? null,
        serialNumber: a.serial_number ?? null,
        department: a.department ?? null,
      })),
      stock,
      summary: {
        availableAssets: assets.length,
        stockItems: stock.length,
        low: flagged.filter((x) => x.status === "low").length,
        out: flagged.filter((x) => x.status === "out").length,
        pendingRequests: pending,
        approvedRequests: approved,
      },
    });
  } catch (err) {
    return fail(res, err, "Load spare overview");
  }
});

/** PUT /spare/levels/:assetType  { minLevel }  (approver) */
router.put("/spare/levels/:assetType", authMiddleware, async (req: Request, res: Response) => {
  try {
    requireApprover(req);
    const email = emailOf(req);
    const assetType = requiredText(String(req.params.assetType), "Asset type", 60);
    const minLevel = cleanInt(req.body?.minLevel, "Minimum level", 0, 100000);

    await db("spare_thresholds")
      .insert({ asset_type: assetType, min_level: minLevel, updated_by: email, updated_at: db.fn.now() })
      .onConflict("asset_type")
      .merge();

    await audit.execute(email, "Edit", "spare_thresholds", assetType, null, { minLevel }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Set minimum level");
  }
});

// ---------- stock items ----------

/** POST /spare/items */
router.post("/spare/items", authMiddleware, async (req: Request, res: Response) => {
  try {
    const email = emailOf(req);
    const b = req.body ?? {};
    const name = requiredText(b.name, "Name", 120);
    const category = cleanText(b.category, "Category", 60);
    const unit = cleanText(b.unit, "Unit", 20) ?? "pcs";
    const onHand = cleanInt(b.onHand ?? 0, "On hand", 0, 1000000);
    const minLevel = cleanInt(b.minLevel ?? 0, "Minimum level", 0, 1000000);
    const location = cleanText(b.location, "Location", 120);
    const notes = cleanText(b.notes, "Notes", 2000);

    const dup = await db("spare_items").whereNull("deleted_at").whereRaw("lower(name) = lower(?)", [name]).first("id");
    if (dup) throw new ApiError(409, `A stock item named "${name}" already exists.`);

    const id: number = await db.transaction(async (trx) => {
      const ins: any[] = await trx("spare_items")
        .insert({ name, category, unit, on_hand: onHand, min_level: minLevel, location, notes, created_by: email, updated_by: email })
        .returning("id");
      const first: any = ins[0];
      const newId: number = typeof first === "object" ? first.id : first;
      if (onHand > 0) {
        await trx("spare_movements").insert({
          item_id: newId, kind: "in", qty: onHand, balance_after: onHand, note: "Opening balance", created_by: email,
        });
      }
      return newId;
    });

    await audit.execute(email, "Create", "spare_items", String(id), null, { name, onHand, minLevel }, req.ip || "");
    return res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    return fail(res, err, "Create stock item");
  }
});

/** PUT /spare/items/:id  (details and minimum level; the count changes through movements) */
router.put("/spare/items/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};
    const before: any = await db("spare_items").where("id", id).whereNull("deleted_at").first();
    if (!before) throw new ApiError(404, "Stock item not found.");

    const changes: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = requiredText(b.name, "Name", 120);
      const dup = await db("spare_items").whereNull("deleted_at").whereNot("id", id).whereRaw("lower(name) = lower(?)", [name]).first("id");
      if (dup) throw new ApiError(409, `A stock item named "${name}" already exists.`);
      changes.name = name;
    }
    if (b.category !== undefined) changes.category = cleanText(b.category, "Category", 60);
    if (b.unit !== undefined) changes.unit = cleanText(b.unit, "Unit", 20) ?? "pcs";
    if (b.minLevel !== undefined) changes.min_level = cleanInt(b.minLevel, "Minimum level", 0, 1000000);
    if (b.location !== undefined) changes.location = cleanText(b.location, "Location", 120);
    if (b.notes !== undefined) changes.notes = cleanText(b.notes, "Notes", 2000);
    if (Object.keys(changes).length === 0) throw new ApiError(400, "Nothing to update.");

    changes.updated_by = email;
    changes.updated_at = db.fn.now();
    await db("spare_items").where("id", id).update(changes);

    await audit.execute(email, "Edit", "spare_items", String(id), { name: before.name, minLevel: before.min_level }, { name: changes.name ?? before.name, minLevel: changes.min_level ?? before.min_level }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Update stock item");
  }
});

/** DELETE /spare/items/:id  (soft delete; not while a request still needs it) */
router.delete("/spare/items/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const before: any = await db("spare_items").where("id", id).whereNull("deleted_at").first();
    if (!before) throw new ApiError(404, "Stock item not found.");

    const open: any = await db("spare_requests").where("item_id", id).whereIn("status", ["Pending", "Approved"]).first("id");
    if (open) throw new ApiError(409, "This item has open requests. Issue or cancel them first.");

    await db("spare_items").where("id", id).update({ deleted_at: db.fn.now(), updated_by: email, updated_at: db.fn.now() });
    await audit.execute(email, "Delete", "spare_items", String(id), { name: before.name, onHand: before.on_hand }, null, req.ip || "");
    return res.status(200).json({ success: true, message: "Stock item deleted." });
  } catch (err) {
    return fail(res, err, "Delete stock item");
  }
});

/** POST /spare/items/:id/adjust  { kind: 'in' | 'out' | 'adjust', qty, note } */
router.post("/spare/items/:id/adjust", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};
    const kind = b.kind;
    if (kind !== "in" && kind !== "out" && kind !== "adjust") {
      throw new ApiError(400, "Kind must be in, out or adjust.");
    }
    const qty = cleanInt(b.qty, "Quantity", kind === "adjust" ? 0 : 1, 1000000);
    const note = cleanText(b.note, "Note", 500);
    if ((kind === "out" || kind === "adjust") && !note) {
      throw new ApiError(400, "A note is required when removing stock or correcting the count.");
    }

    const balance: number = await db.transaction(async (trx) => {
      const item: any = await trx("spare_items").where("id", id).whereNull("deleted_at").forUpdate().first();
      if (!item) throw new ApiError(404, "Stock item not found.");
      let next: number;
      if (kind === "in") next = item.on_hand + qty;
      else if (kind === "out") {
        if (qty > item.on_hand) throw new ApiError(409, `Only ${item.on_hand} in stock.`);
        next = item.on_hand - qty;
      } else next = qty;

      await trx("spare_items").where("id", id).update({ on_hand: next, updated_by: email, updated_at: trx.fn.now() });
      await trx("spare_movements").insert({ item_id: id, kind, qty, balance_after: next, note, created_by: email });
      return next;
    });

    await audit.execute(email, "Edit", "spare_items", String(id), null, { movement: kind, qty, balance }, req.ip || "");
    return res.status(201).json({ success: true, data: { onHand: balance } });
  } catch (err) {
    return fail(res, err, "Adjust stock");
  }
});

/** GET /spare/items/:id/movements */
router.get("/spare/items/:id/movements", async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const result = await db.raw(
      `SELECT id, kind, qty, balance_after, reference, department, recipient, note, created_by,
              EXTRACT(EPOCH FROM created_at)::float8 AS ts
         FROM spare_movements WHERE item_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
      [id]
    );
    return res.status(200).json(
      result.rows.map((m: any) => ({
        id: m.id,
        kind: m.kind,
        qty: m.qty,
        balanceAfter: m.balance_after,
        reference: m.reference ?? null,
        department: m.department ?? null,
        recipient: m.recipient ?? null,
        note: m.note ?? null,
        by: m.created_by ?? null,
        atMs: Math.round(m.ts * 1000),
      }))
    );
  } catch (err) {
    return fail(res, err, "Load movements");
  }
});

// ---------- requests ----------

const REQUESTS_SQL = `
  SELECT r.*, i.name AS item_name, i.unit AS item_unit,
         COALESCE((SELECT array_agg(a.asset_tag ORDER BY a.asset_tag)
                     FROM spare_request_assets a WHERE a.request_id = r.id), '{}') AS tags,
         EXTRACT(EPOCH FROM r.created_at)::float8 AS created_s,
         EXTRACT(EPOCH FROM r.decided_at)::float8 AS decided_s,
         EXTRACT(EPOCH FROM r.issued_at)::float8  AS issued_s
    FROM spare_requests r
    LEFT JOIN spare_items i ON i.id = r.item_id`;

const ms = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 1000));

function toRequestDto(r: any) {
  return {
    id: r.id,
    requestNo: r.request_no,
    kind: r.kind,
    assetType: r.asset_type ?? null,
    itemId: r.item_id ?? null,
    itemName: r.item_name ?? null,
    unit: r.item_unit ?? null,
    qty: r.qty,
    requesterName: r.requester_name,
    department: r.department,
    reason: r.reason ?? null,
    status: r.status,
    requestedBy: r.requested_by ?? null,
    decidedBy: r.decided_by ?? null,
    decisionNote: r.decision_note ?? null,
    issuedBy: r.issued_by ?? null,
    assetTags: r.tags ?? [],
    createdMs: ms(r.created_s),
    decidedMs: ms(r.decided_s),
    issuedMs: ms(r.issued_s),
  };
}

async function getRequest(id: number): Promise<any | null> {
  const result = await db.raw(REQUESTS_SQL + " WHERE r.id = ?", [id]);
  return result.rows[0] ?? null;
}

/** GET /spare/requests?status=open|all|Pending|Approved|... */
router.get("/spare/requests", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "open");
    let where = "";
    const params: any[] = [];
    if (status === "open") where = " WHERE r.status IN ('Pending', 'Approved')";
    else if (status !== "all") {
      where = " WHERE r.status = ?";
      params.push(status);
    }
    const result = await db.raw(
      REQUESTS_SQL +
        where +
        " ORDER BY (r.status IN ('Pending', 'Approved')) DESC, r.created_at DESC, r.id DESC LIMIT 300",
      params
    );
    return res.status(200).json(result.rows.map(toRequestDto));
  } catch (err) {
    return fail(res, err, "Load requests");
  }
});

/** POST /spare/requests  { kind, assetType | itemId, qty, requesterName, department, reason } */
router.post("/spare/requests", authMiddleware, async (req: Request, res: Response) => {
  try {
    const email = emailOf(req);
    const b = req.body ?? {};
    const kind = b.kind;
    if (kind !== "asset" && kind !== "stock") throw new ApiError(400, "Kind must be asset or stock.");

    const requesterName = requiredText(b.requesterName, "Requester name", 160);
    const department = requiredText(b.department, "Department", 120);
    const reason = cleanText(b.reason, "Reason", 1000);

    let assetType: string | null = null;
    let itemId: number | null = null;
    let qty: number;
    if (kind === "asset") {
      assetType = requiredText(b.assetType, "Asset type", 60);
      qty = cleanInt(b.qty ?? 1, "Quantity", 1, 50);
    } else {
      itemId = cleanInt(b.itemId, "Item", 1, 2147483647);
      qty = cleanInt(b.qty ?? 1, "Quantity", 1, 100000);
      const item: any = await db("spare_items").where("id", itemId).whereNull("deleted_at").first("id");
      if (!item) throw new ApiError(404, "Stock item not found.");
    }

    const id: number = await db.transaction(async (trx) => {
      const ins: any[] = await trx("spare_requests")
        .insert({ kind, asset_type: assetType, item_id: itemId, qty, requester_name: requesterName, department, reason, requested_by: email })
        .returning("id");
      const first: any = ins[0];
      const newId: number = typeof first === "object" ? first.id : first;
      await trx.raw(
        `UPDATE spare_requests
            SET request_no = 'SR-' || to_char(created_at, 'YYYY') || '-' || lpad(id::text, 5, '0')
          WHERE id = ?`,
        [newId]
      );
      return newId;
    });

    const created = toRequestDto(await getRequest(id));
    await audit.execute(email, "Create", "spare_requests", String(id), null, { requestNo: created.requestNo, kind, department, qty }, req.ip || "");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return fail(res, err, "Create request");
  }
});

/** POST /spare/requests/:id/approve  { note? }  (approver) */
router.post("/spare/requests/:id/approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    requireApprover(req);
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const note = cleanText(req.body?.note, "Note", 500);

    const done = await db("spare_requests")
      .where({ id, status: "Pending" })
      .update({ status: "Approved", decided_by: email, decided_at: db.fn.now(), decision_note: note, updated_at: db.fn.now() });
    if (done === 0) {
      const r = await getRequest(id);
      if (!r) throw new ApiError(404, "Request not found.");
      throw new ApiError(409, `This request is already ${r.status}.`);
    }
    await audit.execute(email, "Edit", "spare_requests", String(id), { status: "Pending" }, { status: "Approved" }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Approve request");
  }
});

/** POST /spare/requests/:id/reject  { note }  (approver) */
router.post("/spare/requests/:id/reject", authMiddleware, async (req: Request, res: Response) => {
  try {
    requireApprover(req);
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const note = requiredText(req.body?.note, "A reason for rejecting", 500);

    const done = await db("spare_requests")
      .where({ id })
      .whereIn("status", ["Pending", "Approved"])
      .update({ status: "Rejected", decided_by: email, decided_at: db.fn.now(), decision_note: note, updated_at: db.fn.now() });
    if (done === 0) {
      const r = await getRequest(id);
      if (!r) throw new ApiError(404, "Request not found.");
      throw new ApiError(409, `This request is already ${r.status}.`);
    }
    await audit.execute(email, "Edit", "spare_requests", String(id), null, { status: "Rejected", note }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Reject request");
  }
});

/** POST /spare/requests/:id/cancel */
router.post("/spare/requests/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const done = await db("spare_requests")
      .where({ id, status: "Pending" })
      .update({ status: "Cancelled", updated_at: db.fn.now() });
    if (done === 0) {
      const r = await getRequest(id);
      if (!r) throw new ApiError(404, "Request not found.");
      throw new ApiError(409, `Only a Pending request can be cancelled. This one is ${r.status}.`);
    }
    await audit.execute(email, "Edit", "spare_requests", String(id), { status: "Pending" }, { status: "Cancelled" }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Cancel request");
  }
});

/** POST /spare/requests/:id/issue  { assetTags?: string[] }  (tagged items need the exact tags) */
router.post("/spare/requests/:id/issue", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const body = req.body ?? {};

    const logs: Array<() => Promise<void>> = [];

    const requestNo: string = await db.transaction(async (trx) => {
      const r: any = await trx("spare_requests").where("id", id).forUpdate().first();
      if (!r) throw new ApiError(404, "Request not found.");

      const needsApproval = APPROVAL_REQUIRED[r.kind as "asset" | "stock"];
      const okStatuses = needsApproval ? ["Approved"] : ["Pending", "Approved"];
      if (!okStatuses.includes(r.status)) {
        throw new ApiError(
          409,
          r.status === "Pending" && needsApproval
            ? "This request needs approval from an IT Manager or Super Admin first."
            : `This request is ${r.status}, so it cannot be issued.`
        );
      }

      if (r.kind === "asset") {
        const raw: unknown = body.assetTags;
        if (!Array.isArray(raw) || raw.some((t) => typeof t !== "string")) {
          throw new ApiError(400, "Pick the asset tags to issue.");
        }
        const tags = raw.map((t: string) => t.trim()).filter(Boolean);
        if (new Set(tags).size !== tags.length) throw new ApiError(400, "The same asset was picked twice.");
        if (tags.length !== r.qty) throw new ApiError(400, `Pick exactly ${r.qty} asset(s); you picked ${tags.length}.`);

        const q = trx("assets").whereIn("asset_tag", tags).forUpdate();
        if (await assetsHaveDeletedAt()) q.whereNull("deleted_at");
        const rows: any[] = await q;
        for (const t of tags) {
          const a = rows.find((x) => x.asset_tag === t);
          if (!a) throw new ApiError(400, `Asset ${t} was not found.`);
          if (a.status !== "Available") throw new ApiError(409, `Asset ${t} is not available (it is ${a.status}).`);
          if (String(a.asset_type ?? "").toLowerCase() !== String(r.asset_type).toLowerCase()) {
            throw new ApiError(400, `Asset ${t} is a ${a.asset_type}, not a ${r.asset_type}.`);
          }
        }

        await trx("assets")
          .whereIn("asset_tag", tags)
          .update({ status: "Issued", department: r.department, updated_by: email, updated_at: trx.fn.now() });
        await trx("spare_request_assets").insert(tags.map((t) => ({ request_id: id, asset_tag: t })));

        for (const a of rows) {
          logs.push(() =>
            audit.execute(
              email, "Edit", "assets", a.asset_tag,
              { status: "Available", department: a.department ?? null },
              { status: "Issued", department: r.department, via: r.request_no },
              req.ip || ""
            )
          );
        }
      } else {
        const item: any = await trx("spare_items").where("id", r.item_id).whereNull("deleted_at").forUpdate().first();
        if (!item) throw new ApiError(404, "Stock item not found.");
        if (item.on_hand < r.qty) throw new ApiError(409, `Only ${item.on_hand} ${item.unit} in stock.`);
        const next = item.on_hand - r.qty;
        await trx("spare_items").where("id", item.id).update({ on_hand: next, updated_by: email, updated_at: trx.fn.now() });
        await trx("spare_movements").insert({
          item_id: item.id, kind: "out", qty: r.qty, balance_after: next,
          reference: r.request_no, department: r.department, recipient: r.requester_name,
          note: r.reason, created_by: email,
        });
      }

      await trx("spare_requests")
        .where("id", id)
        .update({ status: "Issued", issued_by: email, issued_at: trx.fn.now(), updated_at: trx.fn.now() });
      return r.request_no as string;
    });

    for (const log of logs) await log();
    await audit.execute(email, "Edit", "spare_requests", String(id), null, { status: "Issued", requestNo }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Issue request");
  }
});

export default router;
