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

  async findAll(): Promise<Asset[]> {
    return [
      new Asset({
        assetTag: "LAPTOP-001",
        assetType: "Laptop",
        category: "IT Equipment",
        manufacturer: "Dell",
        model: "Latitude 5440",
        serialNumber: "SN123456",
        status: "Available",
      }),
    ];
  }
}