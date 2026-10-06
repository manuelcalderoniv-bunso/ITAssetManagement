import { db } from "../../infrastructure/database/db";

export class GetRecentActivities {

  async execute() {

    return await db("audit_logs")
      .select(
        "occurred_at",
        "user_name",
        "action",
        "record_id"
      )
      .orderBy("occurred_at", "desc")
      .limit(10);
  }
}