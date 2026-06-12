import express, { Router } from "express";
import AuthController from "../controllers/authController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/register/manager", AuthController.registerManager);
router.post("/register/auditor", AuthController.registerAuditor);
router.post("/login", AuthController.loginUser);
router.post("/refresh", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

router.get("/auditors", AuthController.listAuditors);
router.get("/me", AuthMiddleware.requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
