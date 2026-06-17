import express, { Router } from "express";
import { eventController } from "../controllers/eventController";
import authMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

// treadmills must come before /:id to avoid "treadmills" being parsed as an id
router.get("/treadmills", eventController.getTreadmills);
router.post("/treadmills", eventController.createTreadmill);
router.patch("/treadmills/:id", eventController.updateTreadmill);
router.delete("/treadmills/:id", eventController.deleteTreadmill);

router.get("/", eventController.getEvents);
router.post("/", eventController.createEvent);
router.get("/:id", eventController.getEvent);
// iniciar competição: só manager; libera auditores a operar turnos (pending->in_progress)
router.patch("/:id/start", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.startEvent);
// pausar/retomar competição: só manager; congela o cronômetro de 24h sem encerrar (paused_at)
router.patch("/:id/pause", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.pauseEvent);
router.patch("/:id/resume", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.resumeEvent);
// fechar competição: só manager; bloqueia auditores de salvar novos turnos (in_progress->finished)
router.patch("/:id/finish", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.finishEvent);
router.patch("/:id", eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

export default router;
