import { pool } from "../database/connection";

export const exportRepository = {
	async shiftsByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT
			   s.id,
			   s.status,
			   s.start_at,
			   s.end_at,
			   s.total_time,
			   s.km_start,
			   s.km_end,
			   s.distance,
			   s.speed,
			   a.name     AS athlete_name,
			   t.name     AS team_name,
			   tr.number  AS treadmill_number,
			   au.name    AS auditor_name
			 FROM shifts s
			 JOIN athletes a        ON a.id  = s.athlete_id
			 JOIN teams t           ON t.id  = a.team_id
			 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			 LEFT JOIN auditors au   ON au.id = s.auditor_id
			 WHERE t.event_id = $1
			 ORDER BY s.start_at ASC`,
			[eventId]
		);
		return result.rows;
	},

	async checkpointsByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT
			   c.id,
			   c.timestamp,
			   c.distance,
			   c.type,
			   s.id        AS shift_id,
			   a.name      AS athlete_name,
			   t.name      AS team_name,
			   tr.number   AS treadmill_number
			 FROM checkpoints c
			 JOIN shifts s          ON s.id  = c.shift_id
			 JOIN athletes a        ON a.id  = s.athlete_id
			 JOIN teams t           ON t.id  = a.team_id
			 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			 WHERE t.event_id = $1
			 ORDER BY c.timestamp ASC`,
			[eventId]
		);
		return result.rows;
	},
};
