import { pool } from "../database/connection";

export const treadmillRepository = {
	async create(number: number, team_id?: number) {
		const result = await pool.query(
			`INSERT INTO treadmills (number, team_id) VALUES ($1, $2) RETURNING *`,
			[number, team_id ?? null]
		);
		return result.rows[0];
	},

	async findAll() {
		const result = await pool.query(`SELECT * FROM treadmills ORDER BY number ASC`);
		return result.rows;
	},

	async findByTeam(team_id: number) {
		const result = await pool.query(
			`SELECT * FROM treadmills WHERE team_id = $1 ORDER BY number ASC`,
			[team_id]
		);
		return result.rows;
	},

	async findById(id: number) {
		const result = await pool.query(`SELECT * FROM treadmills WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	},

	async update(id: number, number: number) {
		const result = await pool.query(
			`UPDATE treadmills SET number = $1 WHERE id = $2 RETURNING *`,
			[number, id]
		);
		return result.rows[0] ?? null;
	},

	async findBusyIds(): Promise<number[]> {
		const result = await pool.query(
			`SELECT DISTINCT treadmill_id FROM shifts WHERE status = 'in_progress' AND treadmill_id IS NOT NULL`
		);
		return result.rows.map((r: any) => r.treadmill_id);
	},

	async hardDelete(id: number) {
		const result = await pool.query(
			`DELETE FROM treadmills WHERE id = $1 RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
