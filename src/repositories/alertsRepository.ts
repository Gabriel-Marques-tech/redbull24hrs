import { pool } from "../database/connection";

export const alertsRepository = {
	async treadmillsOverThreshold(eventId: number, thresholdMinutes = 30) {
		const result = await pool.query(
			`SELECT
			   s.treadmill_id,
			   tr.number          AS treadmill_number,
			   s.id               AS shift_id,
			   a.name             AS athlete_name,
			   s.start_at,
			   ROUND(EXTRACT(EPOCH FROM (NOW() - s.start_at)) / 60) AS minutes_occupied
			 FROM shifts s
			 JOIN treadmills tr ON tr.id = s.treadmill_id
			 JOIN athletes a    ON a.id  = s.athlete_id
			 JOIN teams t       ON t.id  = a.team_id
			 WHERE t.event_id = $1
			   AND s.status = 'in_progress'
			   AND s.start_at < NOW() - ($2 || ' minutes')::INTERVAL
			 ORDER BY minutes_occupied DESC`,
			[eventId, thresholdMinutes]
		);
		return result.rows;
	},

	async treadmillsWithoutRecentCheckpoint(eventId: number, gapMinutes = 5) {
		const result = await pool.query(
			`SELECT
			   s.id               AS shift_id,
			   tr.number          AS treadmill_number,
			   a.name             AS athlete_name,
			   MAX(c.timestamp)   AS last_checkpoint,
			   ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(c.timestamp), s.start_at))) / 60) AS minutes_since
			 FROM shifts s
			 JOIN treadmills tr ON tr.id = s.treadmill_id
			 JOIN athletes a    ON a.id  = s.athlete_id
			 JOIN teams t       ON t.id  = a.team_id
			 LEFT JOIN checkpoints c ON c.shift_id = s.id
			 WHERE t.event_id = $1
			   AND s.status = 'in_progress'
			 GROUP BY s.id, tr.number, a.name, s.start_at
			 HAVING EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(c.timestamp), s.start_at))) / 60 > $2
			 ORDER BY minutes_since DESC`,
			[eventId, gapMinutes]
		);
		return result.rows;
	},
};
