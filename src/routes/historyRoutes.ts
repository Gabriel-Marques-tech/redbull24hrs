import express, { Router } from "express";
import { historyController } from "../controllers/historyController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.get("/history", AuthMiddleware.requireAuth, historyController.getHistory);

export default router;
