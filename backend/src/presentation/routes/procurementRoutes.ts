import { Router, Request, Response } from "express";
import { db } from "../../infrastructure/database/db";
import { authMiddleware, requireRole } from "../middlewares/authMiddleware";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";

/**
 * Purchase Request Log. Own router: the asset entity / repository / controller
 * are not touched. Every /procurement route (reads and writes) requires a login
 * AND one of the PRL_ROLES below; anything else is 401 / 403. IT Support
 * can view, add and edit; Delivered / Cancelled need PRL_FULL_ROLES. Audit actions stay
 * within Create / Edit.
 *
 *   New -> Delivered (completed_at = delivery date)
 *   New -> Cancelled (reason required)
 *
 * Dates travel as YYYY-MM-DD strings (the columns are DATE), so there is no
 * timezone shift.
 */

const router = Router();
const audit = new CreateAuditLog();

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

/** Full access to the Purchase Request Log. Default deny for everyone else. */
export const PRL_FULL_ROLES = ["Procurement", "IT Manager", "IT Administrator", "Super Admin"];

/** May also view, add and edit requests, but not mark Delivered or Cancel. */
export const PRL_ROLES = [...PRL_FULL_ROLES, "IT Support"];

// Router-level guard: covers every current and future /procurement route.
router.use("/procurement", authMiddleware, requireRole(...PRL_ROLES));

// State transitions (Delivered / Cancelled) are limited to PRL_FULL_ROLES.
const fullAccess = requireRole(...PRL_FULL_ROLES);

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

function cleanDate(v: unknown, label: string): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "string") {
    const m = DATE_RE.exec(v);
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const t = new Date(Date.UTC(y, mo - 1, d));
      if (t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d) {
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

function cleanQty(v: unknown): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 100000) {
    throw new ApiError(400, "Quantity must be a whole number from 1 to 100000.");
  }
  return n;
}

function cleanPriority(v: unknown): string {
  if (v === undefined || v === null || v === "") return "Medium";
  if (typeof v === "string" && PRIORITIES.includes(v)) return v;
  throw new ApiError(400, `Priority must be one of: ${PRIORITIES.join(", ")}.`);
}

function cleanCost(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new ApiError(400, "Estimated cost must be a number, 0 or more.");
  }
  return Math.round(n * 100) / 100;
}

function parseId(v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "Invalid id.");
  return n;
}

async function todayStr(trx: any = db): Promise<string> {
  const r = await trx.raw("SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d");
  return r.rows[0].d as string;
}

// ---------- data access ----------

const SELECT_SQL = `
  SELECT *,
         to_char(requested_at, 'YYYY-MM-DD') AS requested_str,
         to_char(completed_at, 'YYYY-MM-DD') AS completed_str
    FROM purchase_requests`;

function toDto(r: any) {
  return {
    id: r.id,
    prNo: r.pr_no,
    itemDescription: r.item_description,
    itemType: r.item_type ?? null,
    qty: r.qty,
    priority: r.priority,
    requesterName: r.requester_name,
    department: r.department ?? null,
    vendor: r.vendor ?? null,
    estCost: r.est_cost === null || r.est_cost === undefined ? null : Number(r.est_cost),
    purpose: r.purpose ?? null,
    status: r.status,
    requestedAt: r.requested_str,
    completedAt: r.completed_str ?? null,
    cancelReason: r.cancel_reason ?? null,
    createdBy: r.created_by ?? null,
  };
}

async function getOne(id: number, trx: any = db): Promise<any | null> {
  const r = await trx.raw(SELECT_SQL + " WHERE id = ?", [id]);
  return r.rows[0] ?? null;
}

// ---------- routes ----------

/** GET /procurement/requests?status=open|all|New|Delivered|Cancelled */
router.get("/procurement/requests", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "all");
    let where = "";
    const params: any[] = [];
    if (status === "open") where = " WHERE status = 'New'";
    else if (status !== "all") {
      if (!["New", "Delivered", "Cancelled"].includes(status)) {
        throw new ApiError(400, "Status must be open, all, New, Delivered or Cancelled.");
      }
      where = " WHERE status = ?";
      params.push(status);
    }
    const r = await db.raw(
      SELECT_SQL + where + " ORDER BY (status = 'New') DESC, requested_at DESC, id DESC LIMIT 2000",
      params
    );
    return res.status(200).json(r.rows.map(toDto));
  } catch (err) {
    return fail(res, err, "Load purchase requests");
  }
});

/** POST /procurement/requests */
router.post("/procurement/requests", async (req: Request, res: Response) => {
  try {
    const email = emailOf(req);
    const b = req.body ?? {};

    const itemDescription = requiredText(b.itemDescription, "Item description", 255);
    const itemType = cleanText(b.itemType, "Item type", 60);
    const qty = cleanQty(b.qty ?? 1);
    const priority = cleanPriority(b.priority);
    const requesterName = requiredText(b.requesterName, "Requester name", 160);
    const department = cleanText(b.department, "Department", 120);
    const vendor = cleanText(b.vendor, "Vendor", 160);
    const estCost = cleanCost(b.estCost);
    const purpose = cleanText(b.purpose, "Purpose", 2000);
    const requestedAt = cleanDate(b.requestedAt, "Request date");

    const id: number = await db.transaction(async (trx) => {
      const today = await todayStr(trx);
      if (requestedAt && requestedAt > today) {
        throw new ApiError(400, "The request date cannot be in the future.");
      }
      const row: Record<string, unknown> = {
        item_description: itemDescription,
        item_type: itemType,
        qty,
        priority,
        requester_name: requesterName,
        department,
        vendor,
        est_cost: estCost,
        purpose,
        created_by: email,
        updated_by: email,
      };
      if (requestedAt) row.requested_at = requestedAt;

      const ins: any[] = await trx("purchase_requests").insert(row).returning("id");
      const first: any = ins[0];
      const newId: number = typeof first === "object" ? first.id : first;
      await trx.raw(
        `UPDATE purchase_requests
            SET pr_no = 'PR-' || to_char(requested_at, 'YYYY') || '-' || lpad(id::text, 5, '0')
          WHERE id = ?`,
        [newId]
      );
      return newId;
    });

    const created = toDto(await getOne(id));
    await audit.execute(email, "Create", "purchase_requests", String(id), null,
      { prNo: created.prNo, itemDescription, qty, priority, requesterName }, req.ip || "");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return fail(res, err, "Create purchase request");
  }
});

/** PUT /procurement/requests/:id  (only while the request is still New) */
router.put("/procurement/requests/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};

    const before = await getOne(id);
    if (!before) throw new ApiError(404, "Purchase request not found.");
    if (before.status !== "New") {
      throw new ApiError(409, `This request is ${before.status} and can no longer be edited.`);
    }

    const changes: Record<string, unknown> = {};
    if (b.itemDescription !== undefined) changes.item_description = requiredText(b.itemDescription, "Item description", 255);
    if (b.itemType !== undefined) changes.item_type = cleanText(b.itemType, "Item type", 60);
    if (b.qty !== undefined) changes.qty = cleanQty(b.qty);
    if (b.priority !== undefined) changes.priority = cleanPriority(b.priority);
    if (b.requesterName !== undefined) changes.requester_name = requiredText(b.requesterName, "Requester name", 160);
    if (b.department !== undefined) changes.department = cleanText(b.department, "Department", 120);
    if (b.vendor !== undefined) changes.vendor = cleanText(b.vendor, "Vendor", 160);
    if (b.estCost !== undefined) changes.est_cost = cleanCost(b.estCost);
    if (b.purpose !== undefined) changes.purpose = cleanText(b.purpose, "Purpose", 2000);
    if (Object.keys(changes).length === 0) throw new ApiError(400, "Nothing to update.");

    changes.updated_by = email;
    changes.updated_at = db.fn.now();
    await db("purchase_requests").where("id", id).update(changes);

    await audit.execute(email, "Edit", "purchase_requests", String(id),
      { itemDescription: before.item_description, priority: before.priority },
      { itemDescription: changes.item_description ?? before.item_description, priority: changes.priority ?? before.priority },
      req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Update purchase request");
  }
});

/** POST /procurement/requests/:id/deliver  { completedAt?, vendor? } */
router.post("/procurement/requests/:id/deliver", fullAccess, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const b = req.body ?? {};
    const completedAt = cleanDate(b.completedAt, "Delivery date");
    const vendor = cleanText(b.vendor, "Vendor", 160);

    await db.transaction(async (trx) => {
      const r: any = await getOne(id, trx);
      if (!r) throw new ApiError(404, "Purchase request not found.");
      if (r.status !== "New") throw new ApiError(409, `This request is already ${r.status}.`);

      const today = await todayStr(trx);
      const date = completedAt ?? today;
      if (date > today) throw new ApiError(400, "The delivery date cannot be in the future.");
      if (date < r.requested_str) throw new ApiError(400, "The delivery date cannot be before the request date.");

      const changes: Record<string, unknown> = {
        status: "Delivered",
        completed_at: date,
        updated_by: email,
        updated_at: trx.fn.now(),
      };
      if (vendor) changes.vendor = vendor;
      await trx("purchase_requests").where("id", id).update(changes);
    });

    await audit.execute(email, "Edit", "purchase_requests", String(id), { status: "New" }, { status: "Delivered" }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Mark delivered");
  }
});

/** POST /procurement/requests/:id/cancel  { reason } */
router.post("/procurement/requests/:id/cancel", fullAccess, async (req: Request, res: Response) => {
  try {
    const id = parseId(String(req.params.id));
    const email = emailOf(req);
    const reason = requiredText(req.body?.reason, "A reason for cancelling", 500);

    await db.transaction(async (trx) => {
      const r: any = await getOne(id, trx);
      if (!r) throw new ApiError(404, "Purchase request not found.");
      if (r.status !== "New") throw new ApiError(409, `This request is already ${r.status}.`);
      await trx("purchase_requests").where("id", id).update({
        status: "Cancelled",
        completed_at: await todayStr(trx),
        cancel_reason: reason,
        updated_by: email,
        updated_at: trx.fn.now(),
      });
    });

    await audit.execute(email, "Edit", "purchase_requests", String(id), { status: "New" }, { status: "Cancelled", reason }, req.ip || "");
    return res.status(200).json({ success: true });
  } catch (err) {
    return fail(res, err, "Cancel purchase request");
  }
});

export default router;
