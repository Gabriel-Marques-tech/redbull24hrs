import { config } from "dotenv";
import { pool } from "./database/connection";
import app from "./app";

config();
const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3000);

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

// Um erro isolado em uma requisição não pode tirar o sistema do ar durante o evento.
process.on("unhandledRejection", (reason) => {
	console.error("[FATAL-EVITADO] Promise rejeitada sem tratamento:", reason);
});
process.on("uncaughtException", (error) => {
	console.error("[FATAL-EVITADO] Exceção não tratada:", error);
});

bootstrap();
