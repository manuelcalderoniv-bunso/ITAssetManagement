import { db } from "../../infrastructure/database/db";

export class GetAssetHistory {

  async execute(
    assetTag: string
  ): Promise<any[]> {

    console.log("SEARCHING HISTORY:", assetTag);

    const history = await db("audit_logs")
      .select("*")
      .where("record_id", assetTag);

    console.log("FOUND HISTORY:", history);

    return history;
  }
}