import { Asset } from "../../domain/entities/Asset";
import { AssetRepository } from "../../domain/repositories/AssetRepository";

export interface CreateAssetRequest {
  assetTag: string;
  assetType: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: string;
}

export class CreateAsset {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {}

  async execute(request: CreateAssetRequest): Promise<Asset> {
    const existingAsset =
      await this.assetRepository.findByAssetTag(request.assetTag);

    if (existingAsset) {
      throw new Error("Asset Tag already exists");
    }

    const asset = new Asset({
      assetTag: request.assetTag,
      assetType: request.assetType,
      category: request.category,
      manufacturer: request.manufacturer,
      model: request.model,
      serialNumber: request.serialNumber,
      status: request.status,
    });

    await this.assetRepository.save(asset);

    return asset;
  }
}
``