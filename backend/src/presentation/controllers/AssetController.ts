import { Request, Response } from "express";
import { CreateAsset } from "../../application/services/CreateAsset";
import { GetAssets } from "../../application/services/GetAssets";

export class AssetController {
  constructor(
    private readonly createAsset: CreateAsset,
    private readonly getAssets: GetAssets
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    console.log("AssetController reached");
    
    try {
      const asset = await this.createAsset.execute(req.body);

      return res.status(201).json({
        success: true,
        data: asset.data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
   }
     async getAll(_req: Request, res: Response): Promise<Response> {
    const assets = await this.getAssets.execute();

    return res.status(200).json(assets);
  }
 }