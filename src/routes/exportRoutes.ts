import express, { Router } from "express";
import { exportController } from "../controllers/exportController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.use(AuthMiddleware.requireAuth);

router.get("/events/:eventId/shifts",      exportController.exportShifts);
router.get("/events/:eventId/checkpoints", exportController.exportCheckpoints);

export default router;
