import express, { Router } from "express";
import { syncController } from "../controllers/syncController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/sync", AuthMiddleware.requireAuth, syncController.sync);

export default router;
