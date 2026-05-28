import { pool } from "../database/connection";

export const teamRepository = {
	async create(name: string, event_id: number) {
		const result = await pool.query(
			`INSERT INTO teams (name, event_id) VALUES ($1, $2) RETURNING *`,
			[name, event_id]
		);
		return result.rows[0];
	},

	async findAll(event_id?: number) {
		if (event_id !== undefined) {
			const result = await pool.query(
				`SELECT * FROM teams WHERE event_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
				[event_id]
			);
			return result.rows;
		}
		const result = await pool.query(
			`SELECT * FROM teams WHERE deleted_at IS NULL ORDER BY name ASC`
		);
		return result.rows;
	},

	async findById(id: number) {
		const result = await pool.query(
			`SELECT * FROM teams WHERE id = $1 AND deleted_at IS NULL`,
			[id]
		);
		return result.rows[0] ?? null;
	},

	async update(id: number, name: string) {
		const result = await pool.query(
			`UPDATE teams SET name = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
			[name, id]
		);
		return result.rows[0] ?? null;
	},

	async softDelete(id: number) {
		const result = await pool.query(
			`UPDATE teams SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
