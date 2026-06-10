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
		await client.query(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				filename   VARCHAR(255) PRIMARY KEY,
				applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		for (const file of files) {
			const already = await client.query(
				`SELECT 1 FROM schema_migrations WHERE filename = $1`,
				[file]
			);
			if ((already.rowCount ?? 0) > 0) {
				console.log(`Migration ignorada (já aplicada): ${file}`);
				continue;
			}

			const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
			try {
				await client.query("BEGIN");
				await client.query(sql);
				await client.query(
					`INSERT INTO schema_migrations (filename) VALUES ($1)`,
					[file]
				);
				await client.query("COMMIT");
				console.log(`Migration executada: ${file}`);
			} catch (error) {
				await client.query("ROLLBACK");
				console.error(`Erro na migration ${file}:`, error);
				throw error;
			}
		}
		console.log("Todas as migrations executadas com sucesso!");
	} catch (error) {
		console.error("Erro ao executar migrations:", error);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
}

migrate();
