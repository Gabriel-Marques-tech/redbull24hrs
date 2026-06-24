import { pool } from "../database/connection";

export const eventRepository = {
	async createWithManager(title: string, local: string, date: string, manager_id: number, image_url: string | null = null) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const eventResult = await client.query(
				`INSERT INTO events (title, local, date, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
				[title, local, date, image_url ?? null]
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

	async update(id: number, fields: { title?: string; local?: string; date?: string; image_url?: string | null }) {
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

	async pause(id: number) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			// marca a pausa no evento (acumulador usado pelo cronômetro do front)
			const result = await client.query(
				`UPDATE events
				 SET paused_at = NOW()
				 WHERE id = $1 AND deleted_at IS NULL AND status = 'in_progress' AND paused_at IS NULL
				 RETURNING *`,
				[id]
			);
			const event = result.rows[0] ?? null;
			if (!event) {
				await client.query("ROLLBACK");
				return null;
			}
			// abre o intervalo no log de pausas com o mesmo instante registrado no evento
			await client.query(
				`INSERT INTO pause_log (event_id, paused_at) VALUES ($1, $2)`,
				[id, event.paused_at]
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

	async resume(id: number) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			// fecha o intervalo aberto e calcula sua duração (fonte da verdade)
			const logResult = await client.query(
				`UPDATE pause_log
				 SET resumed_at = NOW(),
				     duration_seconds = FLOOR(EXTRACT(EPOCH FROM (NOW() - paused_at)))
				 WHERE event_id = $1 AND resumed_at IS NULL
				 RETURNING duration_seconds`,
				[id]
			);
			const closed = logResult.rows[0] ?? null;
			// acumula no evento e limpa paused_at; só prossegue se havia pausa aberta
			const result = await client.query(
				`UPDATE events
				 SET paused_ms = paused_ms + $2::bigint * 1000,
				     paused_at = NULL
				 WHERE id = $1 AND deleted_at IS NULL AND status = 'in_progress' AND paused_at IS NOT NULL
				 RETURNING *`,
				[id, closed ? Number(closed.duration_seconds) : 0]
			);
			const event = result.rows[0] ?? null;
			if (!event || !closed) {
				await client.query("ROLLBACK");
				return null;
			}
			await client.query("COMMIT");
			return event;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	async finish(id: number) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			// se encerrar durante uma pausa, fecha o intervalo aberto para não
			// deixar pausa pendente e manter o desconto de tempo correto
			const logResult = await client.query(
				`UPDATE pause_log
				 SET resumed_at = NOW(),
				     duration_seconds = FLOOR(EXTRACT(EPOCH FROM (NOW() - paused_at)))
				 WHERE event_id = $1 AND resumed_at IS NULL
				 RETURNING duration_seconds`,
				[id]
			);
			const closed = logResult.rows[0] ?? null;
			const result = await client.query(
				`UPDATE events
				 SET status = 'finished',
				     finished_at = NOW(),
				     paused_ms = paused_ms + $2::bigint * 1000,
				     paused_at = NULL
				 WHERE id = $1 AND deleted_at IS NULL AND status = 'in_progress'
				 RETURNING *`,
				[id, closed ? Number(closed.duration_seconds) : 0]
			);
			const event = result.rows[0] ?? null;
			if (!event) {
				await client.query("ROLLBACK");
				return null;
			}
			await client.query("COMMIT");
			return event;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	},

	// rastreabilidade das pausas: lista os intervalos e o total pausado do evento
	async pausesByEvent(id: number) {
		const result = await pool.query(
			`SELECT id, paused_at, resumed_at,
			        COALESCE(duration_seconds, FLOOR(EXTRACT(EPOCH FROM (NOW() - paused_at))))::int AS duration_seconds,
			        resumed_at IS NULL AS ongoing
			 FROM pause_log
			 WHERE event_id = $1
			 ORDER BY paused_at ASC`,
			[id]
		);
		const pauses = result.rows;
		const totalSeconds = pauses.reduce((acc, p) => acc + (Number(p.duration_seconds) || 0), 0);
		return { pauses, totalSeconds, count: pauses.length };
	},

	async softDelete(id: number) {
		const result = await pool.query(
			`UPDATE events SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
			[id]
		);
		return result.rows[0] ?? null;
	},
};
