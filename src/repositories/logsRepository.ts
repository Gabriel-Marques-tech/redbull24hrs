import { pool } from "../database/connection";

export interface LogFilters {
	shift_id?: number | null;
	checkpoint_id?: number | null;
	type?: string | null;
	author_id?: number | null;
}

export const logsRepository = {
	// RF024/RN23: trilha de auditoria imutável, somente leitura.
	// Filtros opcionais combinam em AND; valor null = sem restrição naquele campo.
	async findLogs(filters: LogFilters) {
		const {
			shift_id = null,
			checkpoint_id = null,
			type = null,
			author_id = null,
		} = filters;

		const result = await pool.query(
			`SELECT id, shift_id, checkpoint_id, type, old_value, new_value,
			        author_id, author_role, justification, timestamp
			 FROM logs
			 WHERE ($1::int  IS NULL OR shift_id      = $1)
			   AND ($2::int  IS NULL OR checkpoint_id = $2)
			   AND ($3::text IS NULL OR type          = $3)
			   AND ($4::int  IS NULL OR author_id     = $4)
			 ORDER BY timestamp ASC, id ASC`,
			[shift_id, checkpoint_id, type, author_id]
		);
		return result.rows;
	},
};
