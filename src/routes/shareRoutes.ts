import express, { Router } from "express";
import { shareController } from "../controllers/shareController";

const router: Router = express.Router();

router.get("/athlete/:token", shareController.athletePage);
router.get("/athlete/:token/data", shareController.athleteData);

export default router;
