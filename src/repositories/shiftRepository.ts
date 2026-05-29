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
