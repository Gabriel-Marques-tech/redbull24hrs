import { pool } from "../database/connection";

export const shiftRepository = {
	async findById(id: number) {
		const result = await pool.query(`SELECT * FROM shifts WHERE id = $1`, [id]);
		return result.rows[0] ?? null;
	},

	async athleteExists(athlete_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM athletes WHERE id = $1`, [athlete_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async validateTeamsForAthlete(athlete_id: number): Promise<{ team_id: number; name: string; count: number }[]> {
		const result = await pool.query(
			`SELECT t.id AS team_id, t.name, COUNT(a.id)::int AS count
			 FROM teams t
			 LEFT JOIN athletes a ON a.team_id = t.id AND a.deleted_at IS NULL
			 WHERE t.deleted_at IS NULL
			   AND t.event_id = (
			       SELECT te.event_id FROM athletes at2
			       JOIN teams te ON te.id = at2.team_id
			       WHERE at2.id = $1
			   )
			 GROUP BY t.id, t.name
			 ORDER BY t.id`,
			[athlete_id]
		);
		return result.rows;
	},

	async treadmillExists(treadmill_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM treadmills WHERE id = $1`, [treadmill_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async auditorExists(auditor_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM auditors WHERE id = $1`, [auditor_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async findOpenByAthlete(athlete_id: number) {
		const result = await pool.query(
			`SELECT * FROM shifts WHERE athlete_id = $1 AND status = 'in_progress' LIMIT 1`,
			[athlete_id]
		);
		return result.rows[0] ?? null;
	},

	async findOpenByTreadmill(treadmill_id: number) {
		const result = await pool.query(
			`SELECT * FROM shifts WHERE treadmill_id = $1 AND status = 'in_progress' LIMIT 1`,
			[treadmill_id]
		);
		return result.rows[0] ?? null;
	},

	async start(athlete_id: number, auditor_id: number, treadmill_id: number, km_start: number) {
		const result = await pool.query(
			`INSERT INTO shifts (status, athlete_id, auditor_id, treadmill_id, start_at, km_start, km_end, distance, speed)
			 VALUES ('in_progress', $1, $2, $3, NOW(), $4, $4, 0, 0)
			 RETURNING *`,
			[athlete_id, auditor_id, treadmill_id, km_start]
		);
		return result.rows[0];
	},

	async lastCheckpointKm(shift_id: number): Promise<number | null> {
		const result = await pool.query(
			`SELECT MAX(distance) AS max_km FROM checkpoints WHERE shift_id = $1`,
			[shift_id]
		);
		const max = result.rows[0]?.max_km;
		return max === null || max === undefined ? null : Number(max);
	},

	async lastCheckpointTimestamp(shift_id: number): Promise<Date | null> {
		const result = await pool.query(
			`SELECT MAX(timestamp) AS last_ts FROM checkpoints WHERE shift_id = $1`,
			[shift_id]
		);
		const ts = result.rows[0]?.last_ts;
		return ts ?? null;
	},

	async addCheckpoint(shift_id: number, distance: number, type: string) {
		const result = await pool.query(
			`INSERT INTO checkpoints (shift_id, distance, type) VALUES ($1, $2, $3) RETURNING *`,
			[shift_id, distance, type]
		);
		return result.rows[0];
	},

	async findCheckpointById(checkpoint_id: number) {
		const result = await pool.query(`SELECT * FROM checkpoints WHERE id = $1`, [checkpoint_id]);
		return result.rows[0] ?? null;
	},

	async findNeighborCheckpoints(checkpoint_id: number, shift_id: number) {
		const prev = await pool.query(
			`SELECT distance FROM checkpoints
			 WHERE shift_id = $1 AND id < $2
			 ORDER BY id DESC LIMIT 1`,
			[shift_id, checkpoint_id]
		);
		const next = await pool.query(
			`SELECT distance FROM checkpoints
			 WHERE shift_id = $1 AND id > $2
			 ORDER BY id ASC LIMIT 1`,
			[shift_id, checkpoint_id]
		);
		return {
			prev: prev.rows[0]?.distance ?? null,
			next: next.rows[0]?.distance ?? null,
		};
	},

	async correctCheckpoint(
		checkpoint_id: number,
		new_distance: number,
		old_distance: number,
		author_id: number,
		author_role: string,
		justification?: string
	) {
		const cp = await pool.query(
			`UPDATE checkpoints
			 SET distance          = $1,
			     reviewed          = TRUE,
			     old_distance      = $2,
			     reviewed_at       = NOW(),
			     reviewed_by_id    = $3,
			     reviewed_by_role  = $4,
			     justification     = $5
			 WHERE id = $6
			 RETURNING *`,
			[new_distance, old_distance, author_id, author_role, justification ?? null, checkpoint_id]
		);

		await pool.query(
			`INSERT INTO logs (shift_id, checkpoint_id, type, old_value, new_value, author_id, author_role, justification)
			 VALUES ($1, $2, 'updated', $3, $4, $5, $6, $7)`,
			[
				cp.rows[0].shift_id,
				checkpoint_id,
				old_distance,
				new_distance,
				author_id,
				author_role,
				justification ?? null,
			]
		);

		return cp.rows[0];
	},

	async finish(id: number, km_end: number) {
		const result = await pool.query(
			`UPDATE shifts
			 SET status = 'completed',
			     end_at = NOW(),
			     km_end = $1,
			     distance = $1 - km_start,
			     total_time = NOW() - start_at,
			     speed = CASE
			               WHEN EXTRACT(EPOCH FROM (NOW() - start_at)) > 0
			               THEN ROUND(($1 - km_start) / (EXTRACT(EPOCH FROM (NOW() - start_at)) / 3600.0))
			               ELSE 0
			             END
			 WHERE id = $2 AND status = 'in_progress'
			 RETURNING *`,
			[km_end, id]
		);
		return result.rows[0] ?? null;
	},
};
