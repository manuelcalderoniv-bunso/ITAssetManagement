import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS citext`);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
        CREATE TYPE asset_category AS ENUM
          ('Laptop','Desktop','Printer','Monitor','Network Device','License','Warranty');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
        CREATE TYPE asset_status AS ENUM
          ('Available','Issued','Maintenance','Retired','Disposed');
      END IF;
    END $$;
  `);

  await knex.schema.createTable("assets", (table) => {
    table.bigIncrements("id").primary();
    table.string("asset_tag", 50).notNullable().unique();
    table.string("asset_type", 100).notNullable();
    table.specificType("category", "asset_category").notNullable();
    table.string("manufacturer", 100);
    table.string("model", 100);
    table.string("serial_number", 100);
    table.specificType("status", "asset_status").notNullable().defaultTo("Available");
    table.string("location", 100);
    table.string("department", 100);
    table.date("purchase_date");
    table.decimal("purchase_cost", 12, 2);
    table.string("supplier", 150);
    table.text("image_url");
    table.text("notes");
    table.bigInteger("created_by");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.bigInteger("updated_by");
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["status"], "idx_assets_status");
    table.index(["category"], "idx_assets_category");
    table.index(["serial_number"], "idx_assets_serial");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("assets");
  await knex.raw(`DROP TYPE IF EXISTS asset_status`);
  await knex.raw(`DROP TYPE IF EXISTS asset_category`);
}
