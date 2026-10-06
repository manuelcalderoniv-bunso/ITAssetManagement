import { AssignAsset } from "../../application/services/AssignAsset";
import { authMiddleware } from "../middlewares/authMiddleware";
import { Router } from "express";
import { AssetController } from "../controllers/AssetController";
import { CreateAsset } from "../../application/services/CreateAsset";
import { GetAssets } from "../../application/services/GetAssets";
import { GetAssetByTag } from "../../application/services/GetAssetByTag";
import { UpdateAsset } from "../../application/services/UpdateAsset";
import { DeleteAsset } from "../../application/services/DeleteAsset";
import { KnexAssetRepository } from "../../infrastructure/repositories/KnexAssetRepository";

console.log("assetRoutes loaded");

const router = Router();

const assetRepository = new KnexAssetRepository();

const createAsset = new CreateAsset(assetRepository);
const getAssets = new GetAssets(assetRepository);
const getAssetByTag = new GetAssetByTag(assetRepository);
const updateAsset = new UpdateAsset(assetRepository);
const deleteAsset = new DeleteAsset(assetRepository);
const assignAsset = new AssignAsset();
const assetController = new AssetController(
  createAsset,
  getAssets,
  getAssetByTag,
  updateAsset,
  deleteAsset,
  assignAsset,
);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: Get all assets
 *     tags:
 *       - Assets
 */
router.get(
  "/assets",
    (req, res) => {
    console.log("ASSETS ROUTE HIT");  
    return assetController.getAll(req, res);
  }
);

/**
 * @swagger
 * /api/assets:
 *   post:
 *     summary: Create asset
 *     tags:
 *       - Assets
 */
router.post(
  "/assets",
  (req, res) => {
    return assetController.create(req, res);
  }
);

/**
 * @swagger
 * /api/assets/tag/{tag}:
 *   get:
 *     summary: Get asset by tag
 *     tags:
 *       - Assets
 */
router.get(
  "/assets/tag/:tag",
  (req, res) => {
    return assetController.getByTag(req, res);
  }
);
/**
 * @swagger
 * /api/assets/{tag}:
 *   put:
 *     summary: Update asset
 *     tags:
 *       - Assets
 */
router.put(
  "/assets/:tag",
  (req, res) => {
    return assetController.update(req, res);
  }
);

/**
 * @swagger
 * /api/assets/{tag}:
 *   delete:
 *     summary: Delete asset
 *     tags:
 *       - Assets
 */
router.post(
  "/assets/:tag/assign",
  authMiddleware,
  (req, res) => {
    return assetController.assign(
      req,
      res
    );
  }
);
/**
* @swagger
* /api/assets/{tag}:
* delete:
* summary: Delete asset
* tags:
* - Assets
*/
router.delete(
  "/assets/:tag",
  (req, res) => {
    return assetController.delete(req, res);
  }
);
export default router;