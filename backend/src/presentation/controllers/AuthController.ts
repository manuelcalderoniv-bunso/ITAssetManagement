import { Request, Response } from "express";
import { AuthService } from "../../application/services/AuthService";
import { AuthRequest } from "../middlewares/authMiddleware";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email and password are required" },
        });
      }
      const result = await this.authService.login({ email, password });
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      const pending = message.includes("pending approval");
      return res.status(pending ? 403 : 401).json({
        success: false,
        error: { code: pending ? "PENDING_APPROVAL" : "INVALID_CREDENTIALS", message },
      });
    }
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { fullName, email, password, departmentId } = req.body ?? {};
      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Full name, email, and password are required" },
        });
      }
      const user = await this.authService.register({ fullName, email, password, departmentId });
      return res.status(201).json({
        success: true,
        user,
        message: "Account created. Wait for approval by an IT Manager or Admin.",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message: error instanceof Error ? error.message : "Registration failed",
        },
      });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not signed in" },
        });
      }
      const user = await this.authService.me(req.user.userId);
      return res.status(200).json(user);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error instanceof Error ? error.message : "Not found" },
      });
    }
  }

  async listUsers(_req: Request, res: Response): Promise<Response> {
    const users = await this.authService.listPending();
    return res.status(200).json(users);
  }

  async approve(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid user id" },
        });
      }
      const result = await this.authService.approve(id, req.user?.email ?? "system");
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { code: "APPROVAL_FAILED", message: error instanceof Error ? error.message : "Approval failed" },
      });
    }
  }
}
