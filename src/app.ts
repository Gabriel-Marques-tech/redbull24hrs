import express from "express";
import path from "path";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";
import EventRoutes from "./routes/eventRoutes";
import TeamRoutes from "./routes/teamRoutes";
import ShiftRoutes from "./routes/shiftRoutes";
import HistoryRoutes from "./routes/historyRoutes";
import MetricsRoutes from "./routes/metricsRoutes";
import AlertsRoutes from "./routes/alertsRoutes";
import ExportRoutes from "./routes/exportRoutes";
import LogsRoutes from "./routes/logsRoutes";

config();

const app = express();

app.use(express.json());
app.use("/docs", express.static(path.join(process.cwd(), "docs/api")));
app.use("/auth", AuthRoutes);
app.use("/events", EventRoutes);
app.use("/teams", TeamRoutes);
app.use("/audit", ShiftRoutes);
app.use("/audit", HistoryRoutes);
app.use("/audit", AlertsRoutes);
app.use("/audit", LogsRoutes);
app.use("/metrics", MetricsRoutes);
app.use("/export", ExportRoutes);

export default app;
