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
import cookieParser from "cookie-parser";
import pageRoutes from './routes/pageRoutes'

config();

const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(process.cwd(),'src/Front-End/views'))

app.use(express.json());
app.use(cookieParser())
app.use("/docs", express.static(path.join(process.cwd(), "docs/api")));
app.use("/css", express.static(path.join(process.cwd(), "src/Front-End/css" )))
app.use("/js", express.static(path.join(process.cwd(), "src/Front-End/js" )))
app.use("/assets", express.static(path.join(process.cwd(), "src/Front-End/assets" )))
app.use("/auth", AuthRoutes);
app.use("/events", EventRoutes);
app.use("/teams", TeamRoutes);
app.use("/audit", ShiftRoutes);
app.use("/audit", HistoryRoutes);
app.use("/audit", AlertsRoutes);
app.use("/metrics", MetricsRoutes);
app.use("/export", ExportRoutes);
app.use('', pageRoutes)

export default app;
