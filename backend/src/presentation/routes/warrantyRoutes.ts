import { Router, Request, Response } from "express";
import { db } from "../../infrastructure/database/db";
import { authMiddleware } from "../middlewares/authMiddleware";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";

const router = Router();

/**
 * Warranty endpoints. Kept in their own router so the existing asset
 * entity / repository / controller are not touched.
 *
 * Dates are exchanged as YYYY-MM-DD strings. A plain `date` column would
 * come back as a JS Date and shift by one day in JSON (timezone).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** undefined = not provided (leave as is), null = clear, string = valid date. */
function cleanDate(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v === "string") {
    const m = DATE_RE.exec(v);
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const t = new Date(Date.UTC(y, mo - 1, d));
      // Round-trip check rejects things like 2027-02-30.
      if (
        t.getUTCFullYear() === y &&
        t.getUTCMonth() === mo - 1 &&
        t.getUTCDate() === d
      ) {
        return v;
      }
    }
  }
  throw new Error("Invalid date. Use YYYY-MM-DD.");
}

/**
 * GET /dashboard/warranty-details
 * Every asset that has a warranty end date, soonest first. Read-only.
 */
router.get(
  "/dashboard/warranty-details",
  async (_req: Request, res: Response): Promise<Response> => {
    try {
      const query = db("assets")
        .select(
          "*",
          db.raw("to_char(warranty_start, 'YYYY-MM-DD') AS warranty_start_str"),
          db.raw("to_char(warranty_end, 'YYYY-MM-DD') AS warranty_end_str")
        )
        .whereNotNull("warranty_end")
        .orderBy("warranty_end", "asc");

      // Skip soft-deleted assets, if this table uses deleted_at.
      if (await db.schema.hasColumn("assets", "deleted_at")) {
        query.whereNull("deleted_at");
      }

      const rows: any[] = await query;

      return res.status(200).json(
        rows.map((r) => ({
          assetTag: r.asset_tag,
          assetType: r.asset_type ?? null,
          category: r.category ?? null,
          manufacturer: r.manufacturer ?? null,
          model: r.model ?? null,
          department: r.department ?? null,
          status: r.status ?? null,
          warrantyStart: r.warranty_start_str ?? null,
          warrantyEnd: r.warranty_end_str ?? null,
        }))
      );
    } catch (err) {
      console.error("warranty-details failed:", err);
      return res.status(500).json({ error: "Failed to load warranty details" });
    }
  }
);

/**
 * PUT /assets/:tag/warranty
 * Body: { warrantyStart?: "YYYY-MM-DD" | null, warrantyEnd?: "YYYY-MM-DD" | null }
 * Only the fields that are sent are changed. null (or "") clears the date.
 * The change is written to the audit log.
 */
router.put(
  "/assets/:tag/warranty",
  authMiddleware,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const tag = String(req.params.tag);

      let start: string | null | undefined;
      let end: string | null | undefined;
      try {
        start = cleanDate(req.body?.warrantyStart);
        end = cleanDate(req.body?.warrantyEnd);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e instanceof Error ? e.message : "Invalid date",
        });
      }

      if (start === undefined && end === undefined) {
        return res.status(400).json({
          success: false,
          message: "warrantyStart or warrantyEnd is required",
        });
      }

      const before: any = await db("assets")
        .where("asset_tag", tag)
        .select(
          db.raw("to_char(warranty_start, 'YYYY-MM-DD') AS ws"),
          db.raw("to_char(warranty_end, 'YYYY-MM-DD') AS we")
        )
        .first();

      if (!before) {
        return res
          .status(404)
          .json({ success: false, message: "Asset not found" });
      }

      const nextStart = start === undefined ? before.ws ?? null : start;
      const nextEnd = end === undefined ? before.we ?? null : end;

      if (nextStart && nextEnd && nextEnd < nextStart) {
        return res.status(400).json({
          success: false,
          message: "Warranty end cannot be before warranty start",
        });
      }

      const email: string = (req as any).user?.email ?? "admin@local.dev";

      const changes: Record<string, unknown> = {
        updated_by: email,
        updated_at: db.fn.now(),
      };
      if (start !== undefined) changes.warranty_start = start;
      if (end !== undefined) changes.warranty_end = end;

      await db("assets").where("asset_tag", tag).update(changes);

      await new CreateAuditLog().execute(
        email,
        "Edit",
        "assets",
        tag,
        { warrantyStart: before.ws ?? null, warrantyEnd: before.we ?? null },
        { warrantyStart: nextStart, warrantyEnd: nextEnd },
        req.ip || ""
      );

      return res.status(200).json({
        success: true,
        data: { assetTag: tag, warrantyStart: nextStart, warrantyEnd: nextEnd },
      });
    } catch (err) {
      console.error("update warranty failed:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update warranty" });
    }
  }
);

export default router;
