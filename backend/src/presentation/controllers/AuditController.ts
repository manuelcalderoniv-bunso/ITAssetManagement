import { Request, Response } from "express";
import { GetAssetHistory } from "../../application/services/GetAssetHistory";
import { GetUserHistory } from "../../application/services/GetUserHistory";

export class AuditController {

  constructor(
    private readonly getAssetHistoryService: GetAssetHistory,
    private readonly getUserHistoryService: GetUserHistory
  ) {}

  async getAssetHistory(
    req: Request,
    res: Response
  ): Promise<Response> {

    const history =
      await this.getAssetHistoryService.execute(
        req.params.tag as string
      );

    return res.status(200).json(history);
  }

  async getUserHistory(
    req: Request,
    res: Response
  ): Promise<Response> {

    const history =
      await this.getUserHistoryService.execute(
        req.params.email as string
      );

    return res.status(200).json(history);
  }
}