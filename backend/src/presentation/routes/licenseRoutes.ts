import { Router, Request, Response } from "express";
import { db } from "../../infrastructure/database/db";
import { authMiddleware } from "../middlewares/authMiddleware";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";

/**
 * License inventory. Own router, so the asset entity / repository /
 * controller are not touched. Dates travel as YYYY-MM-DD strings.
 *
 * Reads are open (same as /assets for now); every write needs a login.
 * Audit actions are limited to Create / Edit / Delete, which the audit log
 * already uses; assigning and releasing a seat are logged as "Edit".
 */

const router = Router();
const audit = new CreateAuditLog();

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

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** undefined = not provided, null = cleared, string = valid YYYY-MM-DD. */
function cleanDate(v: unknown, label: string): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "string") {
    const m = DATE_RE.exec(v);
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const t = new Date(Date.UTC(y, mo - 1, d));
      if (
        t.getUTCFullYear() === y &&
        t.getUTCMonth() === mo - 1 &&
        t.getUTCDate() === d
      ) {
        return v;
      }
    }
  }
  throw new ApiError(400, `${label} must be a valid date (YYYY-MM-DD).`);
}

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

function cleanSeats(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 100000) {
    throw new ApiError(400, "Seats must be a whole number from 0 to 100000.");
  }
  return n;
}

function cleanCost(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new ApiError(400, "Cost must be a number, 0 or more.");
  }
  return Math.round(n * 100) / 100;
}

function parseId(v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "Invalid id.");
  return n;
}

// ---------- data access ----------

const BASE_SELECT = `
  SELECT l.*,
         to_char(l.purchase_date, 'YYYY-MM-DD') AS purchase_date_str,
         to_char(l.expiry_date,   'YYYY-MM-DD') AS expiry_date_str,
         COALESCE(u.used, 0)::int AS used_seats
  FROM software_licenses l
  LEFT JOIN (
    SELECT license_id, COUNT(*) AS used
    FROM software_license_assignments
    WHERE released_at IS NULL
    GROUP BY license_id
  ) u ON u.license_id = l.id
  WHERE l.deleted_at IS NULL`;

type LicenseDto = {
  id: number;
  product: string;
  vendor: string | null;
  licenseType: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  cost: number | null;
  reference: string | null;
  notes: string | null;
};

function toDto(r: any): LicenseDto {
  return {
    id: r.id,
    product: r.product,
    vendor: r.vendor ?? null,
    licenseType: r.license_type,
    totalSeats: r.total_seats,
    usedSeats: r.used_seats,
    availableSeats: r.total_seats - r.used_seats,
    purchaseDate: r.purchase_date_str ?? null,
    expiryDate: r.expiry_date_str ?? null,
    cost: r.cost === null || r.cost === undefined ? null : Number(r.cost),
    reference: r.reference ?? null,
    notes: r.notes ?? null,
  };
}

async function getOne(id: number): Promise<any | null> {
  const result = await db.raw(BASE_SELECT + " AND l.id = ?", [id]);
  return result.rows[0] ?? null;
}

// ---------- routes ----------

/** GET /licenses */
router.get("/licenses", async (_req: Request, res: Response) => {
  try {
    const result = await db.raw(BASE_SELECT + " ORDER BY l.product, l.id");
    return res.status(200).json(result.rows.map(toDto));
  } catch (err) {
    return fail(res, err, "Load licenses");
  }
});

/** GET /licenses/:id/assignments  (active first, then released) */
router.get("/licenses/:id/assignments", async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const rows: any[] = await db("software_license_assignments")
      .where("license_id", id)
      .select(
        "id",
        "assignee_name",
        "department",
        "asset_tag",
        "assigned_by",
        "released_by",
        db.raw("to_char(assigned_at, 'YYYY-MM-DD HH24:MI') AS assigned_at_str"),
        db.raw("to_char(released_at, 'YYYY-MM-DD HH24:MI') AS released_at_str")
      )
      .orderByRaw("released_at IS NOT NULL, assigned_at DESC");

    return res.status(200).json(
      rows.map((r) => ({
        id: r.id,
        assigneeName: r.assignee_name,
        department: r.department ?? null,
        assetTag: r.asset_tag ?? null,
        assignedBy: r.assigned_by ?? null,
        assignedAt: r.assigned_at_str,
        releasedAt: r.released_at_str ?? null,
        releasedBy: r.released_by ?? null,
      }))
    );
  } catch (err) {
    return fail(res, err, "Load assignments");
  }
});

/** POST /licenses */
router.post("/licenses", authMiddleware, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const email = emailOf(req);

    const product = requiredText(b.product, "Product", 120);
    const vendor = cleanText(b.vendor, "Vendor", 120);
    const licenseType = cleanText(b.licenseType, "License type", 40) ?? "Subscription";
    const totalSeats = cleanSeats(b.totalSeats ?? 1);
    const purchaseDate = cleanDate(b.purchaseDate, "Purchase date") ?? null;
    const expiryDate = cleanDate(b.expiryDate, "Expiry date") ?? null;
    const cost = cleanCost(b.cost);
    const reference = cleanText(b.reference, "Reference", 120);
    const notes = cleanText(b.notes, "Notes", 2000);

    if (purchaseDate && expiryDate && expiryDate < purchaseDate) {
      throw new ApiError(400, "Expiry date cannot be before the purchase date.");
    }

    const inserted: any[] = await db("software_licenses")
      .insert({
        product,
        vendor,
        license_type: licenseType,
        total_seats: totalSeats,
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        cost,
        reference,
        notes,
        created_by: email,
        updated_by: email,
      })
      .returning("id");
    const first: any = inserted[0];
    const id: number = typeof first === "object" ? first.id : first;

    const created = toDto(await getOne(id));
    await audit.execute(email, "Create", "licenses", String(id), null, created, req.ip || "");

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return fail(res, err, "Create license");
  }
});

/** PUT /licenses/:id  (only the fields that are sent are changed) */
router.put("/licenses/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const before = await getOne(id);
    if (!before) throw new ApiError(404, "License not found.");

    const b = req.body ?? {};
    const changes: Record<string, unknown> = {};

    if (b.product !== undefined) changes.product = requiredText(b.product, "Product", 120);
    if (b.vendor !== undefined) changes.vendor = cleanText(b.vendor, "Vendor", 120);
    if (b.licenseType !== undefined) {
      changes.license_type = cleanText(b.licenseType, "License type", 40) ?? "Subscription";
    }
    if (b.totalSeats !== undefined) {
      const n = cleanSeats(b.totalSeats);
      if (n < before.used_seats) {
        throw new ApiError(
          409,
          `${before.used_seats} seat(s) are in use. Release some before lowering the total to ${n}.`
        );
      }
      changes.total_seats = n;
    }
    const purchase = cleanDate(b.purchaseDate, "Purchase date");
    const expiry = cleanDate(b.expiryDate, "Expiry date");
    if (purchase !== undefined) changes.purchase_date = purchase;
    if (expiry !== undefined) changes.expiry_date = expiry;
    if (b.cost !== undefined) changes.cost = cleanCost(b.cost);
    if (b.reference !== undefined) changes.reference = cleanText(b.reference, "Reference", 120);
    if (b.notes !== undefined) changes.notes = cleanText(b.notes, "Notes", 2000);

    if (Object.keys(changes).length === 0) {
      throw new ApiError(400, "Nothing to update.");
    }

    const nextPurchase = purchase !== undefined ? purchase : before.purchase_date_str;
    const nextExpiry = expiry !== undefined ? expiry : before.expiry_date_str;
    if (nextPurchase && nextExpiry && nextExpiry < nextPurchase) {
      throw new ApiError(400, "Expiry date cannot be before the purchase date.");
    }

    changes.updated_by = email;
    changes.updated_at = db.fn.now();
    await db("software_licenses").where("id", id).update(changes);

    const after = toDto(await getOne(id));
    await audit.execute(email, "Edit", "licenses", String(id), toDto(before), after, req.ip || "");

    return res.status(200).json({ success: true, data: after });
  } catch (err) {
    return fail(res, err, "Update license");
  }
});

/** DELETE /licenses/:id  (soft delete; seats must be released first) */
router.delete("/licenses/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const before = await getOne(id);
    if (!before) throw new ApiError(404, "License not found.");
    if (before.used_seats > 0) {
      throw new ApiError(409, "Release all assigned seats before deleting this license.");
    }

    await db("software_licenses")
      .where("id", id)
      .update({ deleted_at: db.fn.now(), updated_by: email, updated_at: db.fn.now() });

    await audit.execute(email, "Delete", "licenses", String(id), toDto(before), null, req.ip || "");

    return res.status(200).json({ success: true, message: "License deleted." });
  } catch (err) {
    return fail(res, err, "Delete license");
  }
});

/** POST /licenses/:id/assign  { assigneeName, department?, assetTag? } */
router.post("/licenses/:id/assign", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};

    const assignee = requiredText(b.assigneeName, "Assignee name", 160);
    const department = cleanText(b.department, "Department", 120);
    const assetTag = cleanText(b.assetTag, "Asset tag", 50);

    const assignedId: number = await db.transaction(async (trx) => {
      // Lock the license row so two people cannot take the last seat together.
      const lic: any = await trx("software_licenses")
        .where("id", id)
        .whereNull("deleted_at")
        .forUpdate()
        .first();
      if (!lic) throw new ApiError(404, "License not found.");

      const expired = await trx.raw(
        "SELECT 1 FROM software_licenses WHERE id = ? AND expiry_date < CURRENT_DATE",
        [id]
      );
      if (expired.rows.length > 0) throw new ApiError(409, "This license has expired.");

      const countRows: any[] = await trx("software_license_assignments")
        .where("license_id", id)
        .whereNull("released_at")
        .count({ count: "*" });
      const used = Number(countRows[0]?.count ?? 0);
      if (used >= lic.total_seats) {
        throw new ApiError(409, "No seats available. Release a seat or raise the total.");
      }

      if (assetTag) {
        const asset: any = await trx("assets").where("asset_tag", assetTag).first("asset_tag");
        if (!asset) throw new ApiError(400, `Asset ${assetTag} was not found.`);
      }

      const dup = trx("software_license_assignments")
        .where("license_id", id)
        .whereNull("released_at")
        .whereRaw("lower(assignee_name) = lower(?)", [assignee]);
      if (assetTag) dup.where("asset_tag", assetTag);
      else dup.whereNull("asset_tag");
      if ((await dup.first("id")) !== undefined) {
        throw new ApiError(409, "That assignee already has this license.");
      }

      const inserted: any[] = await trx("software_license_assignments")
        .insert({
          license_id: id,
          assignee_name: assignee,
          department,
          asset_tag: assetTag,
          assigned_by: email,
        })
        .returning("id");
      const first: any = inserted[0];
      return typeof first === "object" ? first.id : first;
    });

    await audit.execute(
      email,
      "Edit",
      "licenses",
      String(id),
      null,
      { seat: "assigned", assignee, department, assetTag },
      req.ip || ""
    );

    return res.status(201).json({ success: true, data: { id: assignedId } });
  } catch (err) {
    return fail(res, err, "Assign license");
  }
});

/** POST /license-assignments/:id/release */
router.post(
  "/license-assignments/:id/release",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = parseId(String(req.params.id));
      const email = emailOf(req);

      const a: any = await db("software_license_assignments").where("id", id).first();
      if (!a) throw new ApiError(404, "Assignment not found.");
      if (a.released_at) throw new ApiError(409, "This seat was already released.");

      await db("software_license_assignments")
        .where("id", id)
        .update({ released_at: db.fn.now(), released_by: email });

      await audit.execute(
        email,
        "Edit",
        "licenses",
        String(a.license_id),
        { seat: "assigned", assignee: a.assignee_name, assetTag: a.asset_tag ?? null },
        { seat: "released", assignee: a.assignee_name, assetTag: a.asset_tag ?? null },
        req.ip || ""
      );

      return res.status(200).json({ success: true, message: "Seat released." });
    } catch (err) {
      return fail(res, err, "Release license");
    }
  }
);

export default router;
