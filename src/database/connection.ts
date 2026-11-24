import { Pool, types } from "pg";
import { config } from "dotenv";

config();

// Banco roda em UTC e as colunas são TIMESTAMP (sem timezone).
// Por padrão node-pg interpreta o valor naive como horário LOCAL do processo
// (America/Sao_Paulo), adicionando +3h indevidamente. Forçamos a leitura como UTC.
// OID 1114 = timestamp without time zone.
types.setTypeParser(1114, (value: string) => new Date(value.replace(" ", "T") + "Z"));
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

// Sem este listener, a queda de uma conexão ociosa (reinício do banco, rede)
// emite 'error' sem tratamento e derruba o processo inteiro no meio do evento.
// O pool descarta a conexão ruim sozinho; aqui só registramos.
pool.on("error", (error) => {
	console.error("[DB] Conexão ociosa perdida:", error.message);
});

export { pool };
