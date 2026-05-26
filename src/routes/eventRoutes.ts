import express, { Router } from "express";
import { eventController } from "../controllers/eventController";

const router: Router = express.Router();

// treadmills must come before /:id to avoid "treadmills" being parsed as an id
router.get("/treadmills", eventController.getTreadmills);
router.post("/treadmills", eventController.createTreadmill);
router.patch("/treadmills/:id", eventController.updateTreadmill);
router.delete("/treadmills/:id", eventController.deleteTreadmill);

router.get("/", eventController.getEvents);
router.post("/", eventController.createEvent);
router.get("/:id", eventController.getEvent);
router.patch("/:id", eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

export default router;
