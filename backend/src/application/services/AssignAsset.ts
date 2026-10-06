import { db } from "../../infrastructure/database/db";

export interface AssignAssetRequest {
  assetTag: string;
  employeeName: string;
  department: string;
  assignedBy: string;
}

export class AssignAsset {

  async execute(
    request: AssignAssetRequest
  ): Promise<void> {

    await db("asset_assignments").insert({
      asset_tag: request.assetTag,
      employee_name: request.employeeName,
      department: request.department,
      assigned_by: request.assignedBy
    });

  }
}