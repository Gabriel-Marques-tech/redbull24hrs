import { Pool } from "pg";
import { config } from "dotenv";

config();
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	password: process.env.DATABASE_KEY,
	host: process.env.DATABASE_HOST,
	port: Number(process.env.DATABASE_PORT),
	application_name: process.env.DATABASE_NAME,
	max: 15,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

export { pool };
