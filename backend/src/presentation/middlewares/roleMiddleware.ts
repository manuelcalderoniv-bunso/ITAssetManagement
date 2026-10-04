import { Request, Response, NextFunction } from "express";

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (
    user.role !== "Super Admin" &&
    user.role !== "Admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Access Denied"
    });
  }

  next();
};