import express, { Router } from "express";
import multer from "multer";
import AuthController from "../controllers/authController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/register/manager", upload.single("photo"), AuthController.registerManager);
router.post("/register/auditor", upload.single("photo"), AuthController.registerAuditor);
router.post("/login", AuthController.loginUser);
router.post("/refresh", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

router.get("/auditors", AuthController.listAuditors);
router.get("/me", AuthMiddleware.requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
