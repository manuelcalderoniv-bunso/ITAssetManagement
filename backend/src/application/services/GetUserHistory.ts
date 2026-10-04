import { db } from "../../infrastructure/database/db";

export class GetUserHistory {

  async execute(
    email: string
  ): Promise<any[]> {

    const history = await db("audit_logs")
      .select("*")
      .where("user_name", email)
      .orderBy("occurred_at", "desc");

    return history;
  }
}