// src/database/migrate.ts
import { config } from "dotenv";
config();

import { pool } from "./connection";
import fs from "fs";
import path from "path";

async function migrate() {
	const client = await pool.connect();
	try {
		const sql = fs.readFileSync(
			path.join(__dirname, "migrations", "001_initialSchema.sql"),
			"utf-8",
		);
		await client.query(sql);
		console.log("Migrations executadas com sucesso!");
	} catch (error) {
		console.error("Erro ao executar migrations:", error);
	} finally {
		client.release();
		await pool.end();
	}
}

migrate();
