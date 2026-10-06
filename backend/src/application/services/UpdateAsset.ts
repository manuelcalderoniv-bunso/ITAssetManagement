import { AssetRepository } from "../../domain/repositories/AssetRepository";

export class UpdateAsset {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {}

  async execute(
  assetTag: string,
  status: string,
  updatedBy: string
): Promise<void> {

  await this.assetRepository.updateStatus(
    assetTag,
    status,
    updatedBy
  );
}
}