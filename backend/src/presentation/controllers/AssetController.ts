import { AssignAsset } from "../../application/services/AssignAsset";
import { CreateAuditLog } from "../../application/services/CreateAuditLog";
import { Request, Response } from "express";
import { CreateAsset } from "../../application/services/CreateAsset";
import { GetAssets } from "../../application/services/GetAssets";
import { GetAssetByTag } from "../../application/services/GetAssetByTag";
import { UpdateAsset } from "../../application/services/UpdateAsset";
import { DeleteAsset } from "../../application/services/DeleteAsset";

export class AssetController {

  private auditLog = new CreateAuditLog();

  constructor(
  private readonly createAsset: CreateAsset,
  private readonly getAssets: GetAssets,
  private readonly getAssetByTag: GetAssetByTag,
  private readonly updateAsset: UpdateAsset,
  private readonly deleteAsset: DeleteAsset,
  private readonly assignAsset: AssignAsset
) {}
  async create(req: Request, res: Response): Promise<Response> {
    console.log("AssetController reached");
    
    try {
      const user = {
        email: "admin@local.dev",
     };

      const asset =
        await this.createAsset.execute({
          ...req.body,
          createdBy: user.email
      });


      await this.auditLog.execute(
        user.email,
        "Create",
        "assets",
        req.body.assetTag,
        null,
        req.body,
        req.ip || ""
      );

      return res.status(201).json({
        success: true,
        data: asset.data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
   }
     async getAll(
      req: Request, 
      res: Response
    ): Promise<Response> {

      console.log(
        "CURRENT USER:",
        (req as any).user
    );

      const assets = await this.getAssets.execute();
return res.status(200).json(assets.map((a) => a.data));

    }
     async getByTag(
  req: Request,
  res: Response
): Promise<Response> {
  console.log("TAG:", req.params.tag);

  const asset = await this.getAssetByTag.execute(
    req.params.tag as string
  );

  if (!asset) {
    return res.status(404).json({
      message: "Asset not found",
    });
  }

  return res.status(200).json(asset);
}
  async update(
  req: Request,
  res: Response
): Promise<Response> {

  if (!req.body?.status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const user = {
  email: "admin@local.dev",
};

  const oldAsset =
    await this.getAssetByTag.execute(
      req.params.tag as string
    );

  console.log("USER EMAIL:", user.email);

  await this.updateAsset.execute(
  req.params.tag as string,
  req.body.status,
  user.email
);

    await this.auditLog.execute(
    user.email,
    "Edit",
    "assets",
    req.params.tag as string,
    oldAsset,
    {
      status: req.body.status,
    },
    req.ip || ""
  );

  return res.status(200).json({
    success: true,
    message: "Asset updated successfully",
  });
}

async delete(
  req: Request,
  res: Response
): Promise<Response> {

  const user = {
  email: "admin@local.dev",
};

  const oldAsset =
    await this.getAssetByTag.execute(
      req.params.tag as string
    );

  await this.deleteAsset.execute(
    req.params.tag as string
  );

  console.log("DELETE AUDIT START");

  await this.auditLog.execute(
    user.email,
    "Delete",
    "assets",
    req.params.tag as string,
    oldAsset,
    null,
    req.ip || ""
  );

  return res.status(200).json({
    success: true,
    message: "Asset deleted successfully",
  });
}

async assign(
  req: Request,
  res: Response
): Promise<Response> {

  const user = {
  email: "admin@local.dev",
};

  await this.assignAsset.execute({
    assetTag: req.params.tag as string,
    employeeName: req.body.employeeName,
    department: req.body.department,
    assignedBy: user.email
  });

  return res.status(200).json({
    success: true,
    message: "Asset assigned successfully"
  });
}
}