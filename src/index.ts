import { config } from "dotenv";
import { pool } from "./database/connection";
import app from "./app";

config();
const port = Number(process.env.SERVER_PORT);

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
