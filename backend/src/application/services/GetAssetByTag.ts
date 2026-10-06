import { Asset } from "../../domain/entities/Asset";
import { AssetRepository } from "../../domain/repositories/AssetRepository";

export class GetAssetByTag {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {}

  async execute(
    assetTag: string
  ): Promise<Asset | null> {
    return this.assetRepository.findByTag(assetTag);
  }
}