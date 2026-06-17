import { pool } from "../database/connection";

export const eventRepository = {
	async createWithManager(title: string, local: string, date: string, manager_id: number, photo_url: string | null = null) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const eventResult = await client.query(
				`INSERT INTO events (title, local, date, photo_url) VALUES ($1, $2, $3, $4) RETURNING *`,
				[title, local, date, photo_url ?? null]
			);
			const event = eventResult.rows[0];
			await client.query(
				`INSERT INTO manager_events (manager_id, event_id) VALUES ($1, $2)`,
				[manager_id, event.id]
			);
			await client.query("COMMIT");
			return event;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async findAll() {
		const result = await pool.query(
			`SELECT * FROM events WHERE deleted_at IS NULL ORDER BY date ASC`
		);
		return result.rows;
	},

	async findById(id: number) {
		const result = await pool.query(
			`SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL`,
			[id]
		);
		return result.rows[0] ?? null;
	},

	async update(id: number, fields: { title?: string; local?: string; date?: string; photo_url?: string | null }) {
		const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
		if (entries.length === 0) return null;

		const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
		const values = entries.map(([, v]) => v);

		const result = await pool.query(
			`UPDATE events SET ${setClauses} WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING *`,
			[...values, id]
		);
		return result.rows[0] ?? null;
	},

	async start(id: number) {
		const result = await pool.query(
			`UPDATE events
			 SET status = 'in_progress', started_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL AND status = 'pending'
			 RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},

	async finish(id: number) {
		const result = await pool.query(
			`UPDATE events
			 SET status = 'finished', finished_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL AND status = 'in_progress'
			 RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},

	async softDelete(id: number) {
		const result = await pool.query(
			`UPDATE events SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
