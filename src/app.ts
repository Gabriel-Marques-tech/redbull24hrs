import express from "express";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";
import RegistryRoutes from "./routes/registryRoutes";

config();

const app = express();

app.use(express.json());
app.use("/auth", AuthRoutes);
app.use("/registry", RegistryRoutes);

export default app;
