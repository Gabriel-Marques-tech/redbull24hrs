import express, { Router } from "express";
import { teamController } from "../controllers/teamController";

const router: Router = express.Router();

router.get("/", teamController.getTeams);
router.post("/", teamController.createTeam);
router.get("/:id", teamController.getTeam);
router.patch("/:id", teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);

router.get("/:teamId/athletes", teamController.getAthletes);
router.post("/:teamId/athletes", teamController.createAthlete);
router.get("/:teamId/athletes/:id", teamController.getAthlete);
router.patch("/:teamId/athletes/:id", teamController.updateAthlete);
router.delete("/:teamId/athletes/:id", teamController.deleteAthlete);

export default router;
