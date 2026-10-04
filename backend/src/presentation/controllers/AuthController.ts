import { CreateAuditLog } from "../../application/services/CreateAuditLog";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export class AuthController {

  private auditLog = new CreateAuditLog(); 
  async login(
    req: Request,
    res: Response
  ): Promise<Response> {

    const { email, password } = req.body;

    if (
      email === "j.dizon@dizonfarms.example" &&
      password === "Password123"
    ) {

      const token = jwt.sign(
        {
          email,
          role: "Super Admin",
        },
        "mysecretkey",
        {
          expiresIn: "24h",
        }
      );

      console.log("GENERATED TOKEN:", token);

      await this.auditLog.execute(
        email,
        "Login",
        "users",
        email,
        null,
        null,
        req.ip || ""
   );
      
      return res.status(200).json({
        success: true,
        token,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
}