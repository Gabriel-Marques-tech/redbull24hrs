import express, { Router } from "express";
import { logsController } from "../controllers/logsController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.get("/logs", AuthMiddleware.requireAuth, logsController.getLogs);

export default router;
