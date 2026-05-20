import express, { Router } from "express";
import AuthController from "../controllers/authController";

const router: Router = express.Router();

router.get("/teste", () => console.log("teste"));

router.post("/register", AuthController.registerUser);

export default router;
