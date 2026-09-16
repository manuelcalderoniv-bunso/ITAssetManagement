import { AssetRepository } from "../../domain/repositories/AssetRepository";

export class GetAssets {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {}

  async execute() {
    return await this.assetRepository.findAll();
  }
}