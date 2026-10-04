import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();

const authController = new AuthController();

router.post("/auth/login", (req, res) => {
  return authController.login(req, res);
});

export default router;