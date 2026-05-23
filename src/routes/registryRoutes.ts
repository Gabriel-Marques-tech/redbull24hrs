import express, { Router } from "express";
import { registryController } from "../controllers/registryControllers";

const router: Router = express.Router();

router.get("/events", registryController.getEvents);
router.post("/events", registryController.createEvent);
router.get("/events/:eventId/teams", registryController.getTeamsByEvent);
router.post("/events/:eventId/teams", registryController.createTeam);
router.get("/teams/:teamId/athletes", registryController.getAthletesByTeam);
router.post("/teams/:teamId/athletes", registryController.createAthlete);
router.get("/treadmills", registryController.getTreadmills);
router.post("/treadmills", registryController.createTreadmill);

export default router;
