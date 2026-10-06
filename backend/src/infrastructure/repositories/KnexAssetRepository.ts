import { Asset } from "../../domain/entities/Asset";
import { AssetRepository } from "../../domain/repositories/AssetRepository";
import { db } from "../database/db";

interface AssetRow {
  asset_tag: string;
  asset_type: string;
  category: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  created_by: string | null;
  updated_by: string | null;
}

export class KnexAssetRepository implements AssetRepository {
  private toEntity(row: AssetRow): Asset {
    return new Asset({
      assetTag: row.asset_tag,
      assetType: row.asset_type,
      category: row.category,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      status: row.status,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    });
  }

  async findByTag(assetTag: string): Promise<Asset | null> {
    const row = await db<AssetRow>("assets").where("asset_tag", assetTag).first();
    return row ? this.toEntity(row) : null;
  }

  async save(asset: Asset): Promise<void> {
    await db("assets").insert({
      asset_tag: asset.data.assetTag,
      asset_type: asset.data.assetType,
      category: asset.data.category,
      manufacturer: asset.data.manufacturer,
      model: asset.data.model,
      serial_number: asset.data.serialNumber,
      status: asset.data.status,
      created_by: asset.data.createdBy ?? null,
      updated_by: asset.data.updatedBy ?? null,
    });
  }

  async findAll(): Promise<Asset[]> {
    const rows = await db<AssetRow>("assets").select("*");
    return rows.map((row) => this.toEntity(row));
  }

  async updateStatus(assetTag: string, status: string, updatedBy: string): Promise<void> {
    await db("assets").where("asset_tag", assetTag).update({
      status,
      updated_by: updatedBy,
      updated_at: db.fn.now(),
    });
  }

  async delete(assetTag: string): Promise<void> {
    await db("assets").where("asset_tag", assetTag).delete();
  }
}