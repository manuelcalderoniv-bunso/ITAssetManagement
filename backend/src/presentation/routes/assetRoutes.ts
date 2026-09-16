import { Router } from "express";
import { AssetController } from "../controllers/AssetController";
import { CreateAsset } from "../../application/services/CreateAsset";
import { KnexAssetRepository } from "../../infrastructure/repositories/KnexAssetRepository";
import { GetAssets } from "../../application/services/GetAssets";
console.log("assetRoutes loaded");
const router = Router();

const assetRepository = new KnexAssetRepository();

const createAsset = new CreateAsset(assetRepository);
const getAssets = new GetAssets(assetRepository);

const assetController = new AssetController(
  createAsset,
  getAssets
);

router.get("/assets", (req, res) => {
  return assetController.getAll(req, res);
});

router.post("/assets", (req, res) => {
  return assetController.create(req, res);
});

export default router;