import express, { Router } from "express";
import { shiftController } from "../controllers/shiftController";
import { imageController } from "../controllers/imageController";
import authMiddleware from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";

const router: Router = express.Router();

router.get("/shifts/:id/status", authMiddleware.requireAuth, shiftController.getShiftStatus);
router.get("/shifts/:id/checkpoints", authMiddleware.requireAuth, shiftController.listCheckpoints);
router.post("/shifts/start", shiftController.startShift);
router.post("/shifts/:id/checkpoints", shiftController.registerCheckpoint);
router.patch("/shifts/:id/finish", shiftController.finishShift);
router.patch("/shifts/:id/abandon", shiftController.abandonShift);
router.patch("/shifts/:id", authMiddleware.requireAuth, shiftController.updateShift);
router.patch("/checkpoints/:id", authMiddleware.requireAuth, shiftController.correctCheckpoint);
router.patch("/shifts/:id/image", authMiddleware.requireAuth, upload.single("image"), imageController.uploadShiftImage);
router.patch("/checkpoints/:id/image", authMiddleware.requireAuth, upload.single("image"), imageController.uploadCheckpointImage);

export default router;
