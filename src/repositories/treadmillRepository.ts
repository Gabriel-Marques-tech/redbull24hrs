import { pool } from "../database/connection";

export const treadmillRepository = {
	async create(number: number) {
		const result = await pool.query(
			`INSERT INTO treadmills (number) VALUES ($1) RETURNING *`,
			[number]
		);
		return result.rows[0];
	},

	async findAll() {
		const result = await pool.query(`SELECT * FROM treadmills ORDER BY number ASC`);
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

	async hardDelete(id: number) {
		const result = await pool.query(
			`DELETE FROM treadmills WHERE id = $1 RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
