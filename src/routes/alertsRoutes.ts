import express, { Router } from "express";
import { alertsController } from "../controllers/alertsController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.get("/alerts", AuthMiddleware.requireAuth, alertsController.getAlerts);

export default router;
