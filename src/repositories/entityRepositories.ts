import { pool } from "../database/connection";

export const eventRepository = {
	async createWithManager(title: string, local: string, date: string, manager_id: number) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const eventResult = await client.query(
				`INSERT INTO events (title, local, date) VALUES ($1, $2, $3) RETURNING *`,
				[title, local, date]
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

	async findById(id: number) {
		const result = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	},

	async findAll() {
		const result = await pool.query(`SELECT * FROM events ORDER BY date ASC`);
		return result.rows;
	},
};

export const teamRepository = {
	async create(name: string, event_id: number) {
		const result = await pool.query(
			`INSERT INTO teams (name, event_id)
			 VALUES ($1, $2)
			 RETURNING *`,
			[name, event_id]
		);
		return result.rows[0];
	},

	async findById(id: number) {
		const result = await pool.query(`SELECT * FROM teams WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	},

	async findByEventId(event_id: number) {
		const result = await pool.query(`SELECT * FROM teams WHERE event_id = $1 ORDER BY name ASC`, [event_id]);
		return result.rows;
	},
};

export const athleteRepository = {
	async create(name: string, gender: string, cpf: string | null, team_id: number) {
		const result = await pool.query(
			`INSERT INTO athletes (name, gender, cpf, team_id)
			 VALUES ($1, $2, $3, $4)
			 RETURNING *`,
			[name, gender, cpf ?? null, team_id]
		);
		return result.rows[0];
	},

	async findByTeamId(team_id: number) {
		const result = await pool.query(`SELECT * FROM athletes WHERE team_id = $1 ORDER BY name ASC`, [team_id]);
		return result.rows;
	},
};

export const treadmillRepository = {
	async create(number: number) {
		const result = await pool.query(
			`INSERT INTO treadmills (number)
			 VALUES ($1)
			 RETURNING *`,
			[number]
		);
		return result.rows[0];
	},

	async findAll() {
		const result = await pool.query(`SELECT * FROM treadmills ORDER BY number ASC`);
		return result.rows;
	},
};
