import { AssetRepository } from "../../domain/repositories/AssetRepository";
export class DeleteAsset {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {}

  async execute(
    assetTag: string
  ): Promise<void> {
    await this.assetRepository.delete(
      assetTag
    );
  }
}