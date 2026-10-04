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


export default router;
