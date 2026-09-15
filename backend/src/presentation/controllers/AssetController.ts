import { Request, Response } from "express";
import { CreateAsset } from "../../application/services/CreateAsset";

export class AssetController {
  constructor(
    private readonly createAsset: CreateAsset
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
}