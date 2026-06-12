import express, { Router } from "express";
import { shiftController } from "../controllers/shiftController";

const router: Router = express.Router();

router.get("/shifts/:id/status", authMiddleware.requireAuth, shiftController.getShiftStatus);
router.get("/shifts/:id/checkpoints", authMiddleware.requireAuth, shiftController.listCheckpoints);
router.post("/shifts/start", shiftController.startShift);
router.post("/shifts/:id/checkpoints", shiftController.registerCheckpoint);
router.patch("/shifts/:id/finish", shiftController.finishShift);
router.patch("/shifts/:id/abandon", shiftController.abandonShift);
router.patch("/shifts/:id", authMiddleware.requireAuth, shiftController.updateShift);
router.patch("/checkpoints/:id", authMiddleware.requireAuth, shiftController.correctCheckpoint);

export default router;
