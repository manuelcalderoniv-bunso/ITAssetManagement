import { Router } from "express";
import { AssetController } from "../controllers/AssetController";
import { CreateAsset } from "../../application/services/CreateAsset";
import { KnexAssetRepository } from "../../infrastructure/repositories/KnexAssetRepository";
console.log("assetRoutes loaded");
const router = Router();

const assetRepository = new KnexAssetRepository();
const createAsset = new CreateAsset(assetRepository);
const assetController = new AssetController(createAsset);

router.get("/assets", (_req, res) => {
  res.json({
    message: "Assets endpoint is working",
  });
});

router.post("/assets", (_req, res) => {
  console.log("POST /assets reached");

  return res.json({
    success: true,
    message: "NEW ROUTE WORKING"
  });
});

export default router;