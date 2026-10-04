import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

console.log("AUTH MIDDLEWARE FILE LOADED");

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {

  console.log("MIDDLEWARE HIT");

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  console.log("AUTH HEADER:", authHeader);
  console.log("TOKEN FROM REQUEST:", token);

  try {

    const decoded = jwt.verify(
      token,
      "mysecretkey"
    );

    (req as any).user = decoded;

    next();

  } catch (error) {
    console.error("JWT ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
}