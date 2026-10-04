import { GetRecentActivities } from "../../application/services/GetRecentActivities";
import { Request, Response } from "express";
import { GetDashboardStats } from "../../application/services/TempDashboardStats";

export class DashboardController {

  constructor(
  private readonly getDashboardStats: GetDashboardStats,
  private readonly getRecentActivities: GetRecentActivities
) {}

  async recentActivities(
  req: Request,
  res: Response
): Promise<Response> {

  const result =
    await this.getRecentActivities.execute();

  return res.status(200).json(result);
}

  async stats(
    req: Request,
    res: Response
  ): Promise<Response> {

    const result =
      await this.getDashboardStats.execute();

    return res.status(200).json(result);
  }
}