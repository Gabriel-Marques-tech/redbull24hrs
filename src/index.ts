import express from "express";
import { pool } from "./database/connection";
import { config } from "dotenv";
import AuthRoutes from "./routes/auth";

config();
const port = Number(process.env.SERVER_PORT);
const app = express();

app.use(express.json());
app.use("/auth", AuthRoutes);

async function bootstrap() {
	try {
		const client = await pool.connect();
		client.release();
		console.log("Conexão com o banco estabelecida");

		app.listen(port, () => console.log(`On-line server on ${port} port`));
	} catch (error) {
		console.error("Erro ao conectar com o banco:", error);
		process.exit(1);
	}
}

bootstrap();
