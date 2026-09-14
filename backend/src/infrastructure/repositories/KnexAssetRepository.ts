import { Asset } from "../../domain/entities/Asset";
import { AssetRepository } from "../../domain/repositories/AssetRepository";

export class KnexAssetRepository implements AssetRepository {
  async findByAssetTag(assetTag: string): Promise<Asset | null> {
    console.log("Find asset by tag:", assetTag);

    return null;
  }

  async save(asset: Asset): Promise<void> {
    console.log("Saving asset:", asset.data);
  }
}