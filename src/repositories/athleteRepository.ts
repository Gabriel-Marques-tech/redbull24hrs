import { pool } from "../database/connection";

export const athleteRepository = {
	async create(name: string, gender: string, cpf: string | null, team_id: number, photo_url: string | null = null) {
		const result = await pool.query(
			`INSERT INTO athletes (name, gender, cpf, team_id, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
			[name, gender, cpf ?? null, team_id, photo_url ?? null]
		);
		return result.rows[0];
	},

	async findByTeamId(team_id: number) {
		const result = await pool.query(
			`SELECT * FROM athletes WHERE team_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
			[team_id]
		);
		return result.rows;
	},

	async findById(id: number) {
		const result = await pool.query(
			`SELECT * FROM athletes WHERE id = $1 AND deleted_at IS NULL`,
			[id]
		);
		return result.rows[0] ?? null;
	},

	async update(id: number, fields: { name?: string; gender?: string; cpf?: string | null; photo_url?: string | null }) {
		const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
		if (entries.length === 0) return null;

		const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
		const values = entries.map(([, v]) => v);

		const result = await pool.query(
			`UPDATE athletes SET ${setClauses} WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING *`,
			[...values, id]
		);
		return result.rows[0] ?? null;
	},

	async softDelete(id: number) {
		const result = await pool.query(
			`UPDATE athletes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
