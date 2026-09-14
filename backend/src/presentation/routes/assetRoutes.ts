import { Router } from "express";

const router = Router();

router.get("/assets", (_req, res) => {
  res.json({
    message: "Assets endpoint is working"
  });
});

router.post("/assets", async (_req, res) => {
  return res.status(501).json({
    message: "Create Asset not wired yet"
  });
});

export default router;