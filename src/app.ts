import express, { Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";
import EventRoutes from "./routes/eventRoutes";
import TeamRoutes from "./routes/teamRoutes";
import ShiftRoutes from "./routes/shiftRoutes";
import HistoryRoutes from "./routes/historyRoutes";
import MetricsRoutes from "./routes/metricsRoutes";
import AlertsRoutes from "./routes/alertsRoutes";
import ExportRoutes from "./routes/exportRoutes";
import SyncRoutes from "./routes/syncRoutes";
import LogsRoutes from "./routes/logsRoutes";
import PageRoutes from "./routes/pageRoutes";


config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src/Front-End/views"));

app.use(express.json());
app.use(cookieParser());
// Sem cache em JS/CSS: estáticos servidos direto do source (dev),
// senão o browser mantém versões antigas do auditoria.js/css.
const noCache = {
	etag: false,
	lastModified: false,
	setHeaders: (res: Response) => res.setHeader("Cache-Control", "no-store"),
};

app.use("/docs", express.static(path.join(process.cwd(), "docs/api")));
app.use("/css", express.static(path.join(process.cwd(), "src/Front-End/css"), noCache));
app.use("/js", express.static(path.join(process.cwd(), "src/Front-End/js"), noCache));
app.use("/assets", express.static(path.join(process.cwd(), "src/Front-End/assets")));
app.use("/auth", AuthRoutes);
app.use("/events", EventRoutes);
app.use("/teams", TeamRoutes);
app.use("/audit", ShiftRoutes);
app.use("/audit", HistoryRoutes);
app.use("/audit", AlertsRoutes);
app.use("/audit", SyncRoutes);
app.use("/audit", LogsRoutes);
app.use("/metrics", MetricsRoutes);
app.use("/export", ExportRoutes);
app.use("/", PageRoutes);

export default app;
