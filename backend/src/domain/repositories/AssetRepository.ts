import { Asset } from "../entities/Asset";

export interface AssetRepository {
  findByTag(assetTag: string): Promise<Asset | null>;
  save(asset: Asset): Promise<void>;
  findAll(): Promise<Asset[]>;
  updateStatus(assetTag: string, status: string, updatedBy: string): Promise<void>;
  delete(assetTag: string): Promise<void>;
}
