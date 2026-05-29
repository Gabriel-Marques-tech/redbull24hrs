import express, { Router } from "express";
import { shiftController } from "../controllers/shiftController";

const router: Router = express.Router();

router.post("/shifts/start", shiftController.startShift);
router.post("/shifts/:id/checkpoints", shiftController.registerCheckpoint);
router.patch("/shifts/:id/finish", shiftController.finishShift);

export default router;
