import express, { Router } from "express";
import multer from "multer";
import { teamController } from "../controllers/teamController";

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", teamController.getTeams);
router.post("/", teamController.createTeam);
router.get("/:id", teamController.getTeam);
router.patch("/:id", teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);

router.get("/:teamId/athletes", teamController.getAthletes);
router.post("/:teamId/athletes", upload.single("photo"), teamController.createAthlete);
router.get("/:teamId/athletes/:id", teamController.getAthlete);
router.patch("/:teamId/athletes/:id", upload.single("photo"), teamController.updateAthlete);
router.delete("/:teamId/athletes/:id", teamController.deleteAthlete);

export default router;
