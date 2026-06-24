import express, { Router } from "express";
import multer from "multer";
import { eventController } from "../controllers/eventController";
import authMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// treadmills must come before /:id to avoid "treadmills" being parsed as an id
router.get("/treadmills", eventController.getTreadmills);
router.post("/treadmills", eventController.createTreadmill);
router.patch("/treadmills/:id", eventController.updateTreadmill);
router.delete("/treadmills/:id", eventController.deleteTreadmill);

router.get("/", eventController.getEvents);
router.post("/", upload.single("photo"), eventController.createEvent);
router.get("/:id", eventController.getEvent);
// iniciar competição: só manager; libera auditores a operar turnos (pending->in_progress)
router.patch("/:id/start", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.startEvent);
// fechar competição: só manager; bloqueia auditores de salvar novos turnos (in_progress->finished)
router.patch("/:id/finish", authMiddleware.requireAuth, authMiddleware.requireRole("manager"), eventController.finishEvent);
router.patch("/:id", upload.single("photo"), eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

export default router;
