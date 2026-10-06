import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { AuditController } from "../controllers/AuditController";
import { GetAssetHistory } from "../../application/services/GetAssetHistory";
import { GetUserHistory } from "../../application/services/GetUserHistory";
import { db } from "../../infrastructure/database/db";

const router = Router();

const getAssetHistory = new GetAssetHistory();
const getUserHistory = new GetUserHistory();

const auditController = new AuditController(getAssetHistory, getUserHistory);

router.get("/audit-logs", async (_req, res) => {
  try {
    const rows = await db("audit_logs")
      .select(
        "id",
        "occurred_at",
        "user_name",
        "action",
        "table_name",
        "record_id",
        "ip_address"
      )
      .orderBy("occurred_at", "desc")
      .limit(200);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("AUDIT LOGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/audit/assets/:tag", authMiddleware, (req, res) => {
  return auditController.getAssetHistory(req, res);
});

router.get("/audit/user/:email", authMiddleware, (req, res) => {
  return auditController.getUserHistory(req, res);
});

router.post("/audit/logout", async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Email is required" },
      });
    }
    await db("audit_logs").insert({
      user_name: email,
      action: "Logout",
      table_name: "users",
      record_id: email,
      ip_address: req.ip || null,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("LOGOUT AUDIT ERROR:", error);
    return res.status(500).json({
      success: false,
      error: { code: "AUDIT_FAILED", message: "Could not record sign out" },
    });
  }
});

export default router;
