import { db } from "../../infrastructure/database/db";

export class GetDashboardStats {

  async execute() {

    const assets = await db("assets")
      .count("* as total");

    const users = await db("users")
      .count("* as total");

    const logs = await db("audit_logs")
      .count("* as total");

    return {
      totalAssets: Number(assets[0].total),
      totalUsers: Number(users[0].total),
      totalLogs: Number(logs[0].total)
    };
  }
}
