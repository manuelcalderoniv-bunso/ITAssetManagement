import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { AuthService } from "../../application/services/AuthService";
import { authMiddleware } from "../middlewares/authMiddleware";
console.log("authRoutes loaded");

const router = Router();

const authService = new AuthService();
const authController = new AuthController(authService);

router.post("/auth/login", (req, res) => authController.login(req, res));
router.post("/auth/register", (req, res) => authController.register(req, res));
router.get("/auth/me", authMiddleware, (req, res) => authController.me(req, res));

export default router;
