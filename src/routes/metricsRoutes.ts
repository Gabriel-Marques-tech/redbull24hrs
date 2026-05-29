import express, { Router } from "express";
import { metricsController } from "../controllers/metricsController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.use(AuthMiddleware.requireAuth);

router.get("/events/:eventId/dashboard",  metricsController.getDashboard);
router.get("/events/:eventId/teams",      metricsController.getTeamKm);
router.get("/events/:eventId/athletes",   metricsController.getAthleteKm);
router.get("/athletes/:athleteId/shifts", metricsController.getAvgDistancePerShift);
router.get("/athletes/:athleteId/snapshots",   metricsController.getKmSnapshots);
router.get("/athletes/:athleteId/performance", metricsController.getAthletePerformance);

export default router;
