import express from "express";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";
import EventRoutes from "./routes/eventRoutes";
import TeamRoutes from "./routes/teamRoutes";

config();

const app = express();

app.use(express.json());
app.use("/auth", AuthRoutes);
app.use("/events", EventRoutes);
app.use("/teams", TeamRoutes);

export default app;
