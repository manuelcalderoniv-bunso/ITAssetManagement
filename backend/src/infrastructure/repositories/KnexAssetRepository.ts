import { Asset } from "../../domain/entities/Asset";
import { AssetRepository } from "../../domain/repositories/AssetRepository";
import { db } from "../database/db";

/**
 * FIX (2026-10-28)
 *
 * `manufacturer`, `model` and `serial_number` are NULL-able in the `assets`
 * table, but this interface declared them as `string` and `toEntity` passed
 * them straight into `new Asset(...)`. A single row from the CSV/XLSX import
 * with an empty manufacturer threw during construction, and because `findAll`
 * maps every row with no guard, ONE bad row returned HTTP 500 for the whole
 * /assets page.
 *
 * Two changes:
 *   1. AssetRow now says `string | null` for the three optional fields.
 *   2. `findAll` / `findByTag` skip a row that fails to build instead of
 *      letting it take down the request, and log what was skipped.
 */
interface AssetRow {
  asset_tag: string;
  asset_type: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
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
    const row = await db<AssetRow>("assets").where({ asset_tag: assetTag }).first();
    if (!row) return null;
    try {
      return this.toEntity(row);
    } catch (err) {
      console.error(`[assets] skipped ${assetTag}:`, (err as Error).message);
      return null;
    }
  }

  async save(asset: Asset): Promise<void> {
    const d = asset.data;
    await db("assets").insert({
      asset_tag: d.assetTag,
      asset_type: d.assetType,
      category: d.category,
      manufacturer: d.manufacturer ?? null,
      model: d.model ?? null,
      serial_number: d.serialNumber ?? null,
      status: d.status,
      created_by: d.createdBy ?? null,
      updated_by: d.updatedBy ?? null,
    });
  }

  async findAll(): Promise<Asset[]> {
    const rows = await db<AssetRow>("assets").select("*");

    const out: Asset[] = [];
    const skipped: string[] = [];

    for (const row of rows) {
      try {
        out.push(this.toEntity(row));
      } catch (err) {
        // Isang sirang row ay hindi dapat magpabagsak sa buong listahan.
        skipped.push(row?.asset_tag ?? "(no tag)");
        console.error(
          `[assets] skipped row ${row?.asset_tag ?? "(no tag)"}:`,
          (err as Error).message
        );
      }
    }

    if (skipped.length) {
      console.warn(
        `[assets] ${skipped.length} row(s) skipped out of ${rows.length}:`,
        skipped.join(", ")
      );
    }

    return out;
  }

  async updateStatus(assetTag: string, status: string, updatedBy: string): Promise<void> {
    await db("assets").where({ asset_tag: assetTag }).update({
      status,
      updated_by: updatedBy,
      updated_at: db.fn.now(),
    });
  }

  async delete(assetTag: string): Promise<void> {
    await db("assets").where({ asset_tag: assetTag }).delete();
  }
}
