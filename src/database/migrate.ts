import { config } from "dotenv";
config();

import { pool } from "./connection";
import fs from "fs";
import path from "path";

async function migrate() {
	const migrationsDir = path.join(__dirname, "migrations");
	const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

	const client = await pool.connect();
	try {
		for (const file of files) {
			const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
			await client.query(sql);
			console.log(`Migration executada: ${file}`);
		}
		console.log("Todas as migrations executadas com sucesso!");
	} catch (error) {
		console.error("Erro ao executar migrations:", error);
	} finally {
		client.release();
		await pool.end();
	}
}

migrate();
