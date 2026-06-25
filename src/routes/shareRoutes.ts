import express, { Router } from "express";
import { shareController } from "../controllers/shareController";
import authMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

// Públicas (sem auth)
router.get("/athlete/:token", shareController.athletePage);
router.get("/athlete/:token/data", shareController.athleteData);

// Protegidas (gerente)
router.get("/event/:eventId/athletes", authMiddleware.requireAuth, shareController.eventAthletes);
router.post("/athlete/:token/send-email", authMiddleware.requireAuth, shareController.sendEmail);

export default router;
