import express, { Router } from "express";

const router: Router = express.Router();

router.get("", () => console.log("teste"));

export default router;
