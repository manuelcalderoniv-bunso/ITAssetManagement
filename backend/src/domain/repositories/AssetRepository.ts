import { Asset } from "../entities/Asset";

export interface AssetRepository {
  findByAssetTag(assetTag: string): Promise<Asset | null>;

  save(asset: Asset): Promise<void>;

  findAll(): Promise<Asset[]>;
}