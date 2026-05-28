import express from "express";
import path from "path";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";
import EventRoutes from "./routes/eventRoutes";
import TeamRoutes from "./routes/teamRoutes";
import ShiftRoutes from "./routes/shiftRoutes";

config();

const app = express();

app.use(express.json());
app.use("/docs", express.static(path.join(process.cwd(), "docs/api")));
app.use("/auth", AuthRoutes);
app.use("/events", EventRoutes);
app.use("/teams", TeamRoutes);
app.use("/audit", ShiftRoutes);

export default app;
