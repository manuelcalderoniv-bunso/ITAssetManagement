import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { GetDashboardStats } from "../../application/services/TempDashboardStats";
import { GetRecentActivities } from "../../application/services/GetRecentActivities";
import { db } from "../../infrastructure/database/db";

const router = Router();

const dashboardController = new DashboardController(
  new GetDashboardStats(),
  new GetRecentActivities()
);

router.get("/dashboard/stats", (req, res) => dashboardController.stats(req, res));
router.get("/dashboard/recent-activities", (req, res) =>
  dashboardController.recentActivities(req, res)
);

router.get("/dashboard/assignment-history", async (_req, res) => {
  try {
    const rows = await db("asset_assignments")
      .select("asset_tag", "employee_name", "department", "assigned_at", "returned_at")
      .orderBy("assigned_at", "desc")
      .limit(50);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("ASSIGNMENT HISTORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
// ------------------------------------------------------------
// Chart data
// ------------------------------------------------------------

router.get("/dashboard/by-category", async (_req, res) => {
  try {
    const rows = await db("assets")
      .select("category")
      .count("* as total")
      .groupBy("category")
      .orderBy("total", "desc");

    return res.status(200).json(
      rows.map((r) => ({ name: r.category, value: Number(r.total) }))
    );
  } catch (error) {
    console.error("BY CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      error: { code: "QUERY_FAILED", message: "Could not load category data" },
    });
  }
});

router.get("/dashboard/by-department", async (_req, res) => {
  try {
    const rows = await db("assets")
      .select(db.raw("COALESCE(department, 'Unassigned') as department"))
      .count("* as total")
      .groupBy("department")
      .orderBy("total", "desc");

    return res.status(200).json(
      rows.map((r) => ({ name: r.department, value: Number(r.total) }))
    );
  } catch (error) {
    console.error("BY DEPARTMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      error: { code: "QUERY_FAILED", message: "Could not load department data" },
    });
  }
});

router.get("/dashboard/warranty-expiry", async (_req, res) => {
  try {
    const rows = await db("assets")
      .select(db.raw("TO_CHAR(warranty_end, 'YYYY-MM') as month"))
      .count("* as total")
      .whereNotNull("warranty_end")
      .whereRaw("warranty_end >= CURRENT_DATE")
      .whereRaw("warranty_end <= CURRENT_DATE + INTERVAL '12 months'")
      .groupByRaw("TO_CHAR(warranty_end, 'YYYY-MM')")
      .orderBy("month", "asc");

    return res.status(200).json(
      rows.map((r) => ({ month: r.month, total: Number(r.total) }))
    );
  } catch (error) {
    console.error("WARRANTY EXPIRY ERROR:", error);
    return res.status(500).json({
      success: false,
      error: { code: "QUERY_FAILED", message: "Could not load warranty data" },
    });
  }
});
export default router;