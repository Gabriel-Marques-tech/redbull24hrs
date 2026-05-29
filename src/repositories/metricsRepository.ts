import { pool } from "../database/connection";

export const metricsRepository = {
	async teamKmByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT t.id, t.name,
			        COALESCE(SUM(s.distance), 0) AS total_km
			 FROM teams t
			 LEFT JOIN athletes a ON a.team_id = t.id AND a.deleted_at IS NULL
			 LEFT JOIN shifts s   ON s.athlete_id = a.id AND s.status = 'completed'
			 WHERE t.event_id = $1 AND t.deleted_at IS NULL
			 GROUP BY t.id, t.name
			 ORDER BY total_km DESC`,
			[eventId]
		);
		return result.rows;
	},

	async dashboardByEvent(eventId: number) {
		const [scoreboardRes, statsRes, activeRes] = await Promise.all([
			pool.query(
				`SELECT t.id, t.name,
				        COALESCE(SUM(s.distance), 0) AS total_km
				 FROM teams t
				 LEFT JOIN athletes a ON a.team_id = t.id AND a.deleted_at IS NULL
				 LEFT JOIN shifts s   ON s.athlete_id = a.id AND s.status = 'completed'
				 WHERE t.event_id = $1 AND t.deleted_at IS NULL
				 GROUP BY t.id, t.name
				 ORDER BY total_km DESC`,
				[eventId]
			),
			pool.query(
				`SELECT
				   COUNT(*) FILTER (WHERE s.status = 'in_progress')  AS active_shifts,
				   COUNT(*) FILTER (WHERE s.status = 'completed')     AS completed_shifts,
				   COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km
				 FROM shifts s
				 JOIN athletes a ON a.id = s.athlete_id
				 JOIN teams t    ON t.id = a.team_id
				 WHERE t.event_id = $1`,
				[eventId]
			),
			pool.query(
				`SELECT a.id AS athlete_id, a.name AS athlete_name, tr.number AS treadmill_number
				 FROM shifts s
				 JOIN athletes a    ON a.id = s.athlete_id
				 JOIN teams t       ON t.id = a.team_id
				 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
				 WHERE t.event_id = $1 AND s.status = 'in_progress'`,
				[eventId]
			),
		]);

		const stats = statsRes.rows[0];
		return {
			scoreboard: scoreboardRes.rows,
			active_shifts: Number(stats.active_shifts),
			completed_shifts: Number(stats.completed_shifts),
			total_km: Number(stats.total_km),
			athletes_on_track: activeRes.rows,
		};
	},

	async athleteKmByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT a.id, a.name, t.name AS team_name,
			        COALESCE(SUM(s.distance), 0) AS total_km,
			        COUNT(s.id) AS shift_count
			 FROM athletes a
			 JOIN teams t ON t.id = a.team_id
			 LEFT JOIN shifts s ON s.athlete_id = a.id AND s.status = 'completed'
			 WHERE t.event_id = $1 AND a.deleted_at IS NULL
			 GROUP BY a.id, a.name, t.name
			 ORDER BY total_km DESC`,
			[eventId]
		);
		return result.rows;
	},

	async avgDistancePerShift(athleteId: number) {
		const result = await pool.query(
			`SELECT
			   ROUND(AVG(distance)::NUMERIC, 2) AS avg_distance_per_shift,
			   COUNT(*)                          AS total_shifts,
			   COALESCE(SUM(distance), 0)        AS total_distance
			 FROM shifts
			 WHERE athlete_id = $1 AND status = 'completed'`,
			[athleteId]
		);
		return result.rows[0];
	},

	async kmSnapshots(athleteId: number, eventId: number) {
		const result = await pool.query(
			`SELECT
			   FLOOR(EXTRACT(EPOCH FROM (s.end_at - e.date::TIMESTAMP)) / 3600)::INT AS hour_bucket,
			   SUM(s.distance) AS km_in_bucket
			 FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 JOIN teams t    ON t.id = a.team_id
			 JOIN events e   ON e.id = t.event_id
			 WHERE a.id = $1 AND t.event_id = $2 AND s.status = 'completed'
			 GROUP BY hour_bucket
			 ORDER BY hour_bucket ASC`,
			[athleteId, eventId]
		);
		return result.rows;
	},

	async athletePerformance(athleteId: number, eventId?: number) {
		const params: number[] = [athleteId];
		const eventCond = eventId != null ? `AND t.event_id = $${params.push(eventId)}` : "";

		const result = await pool.query(
			`SELECT
			   s.id, s.start_at, s.end_at, s.distance, s.speed, s.total_time,
			   tr.number AS treadmill_number,
			   COALESCE(
			     json_agg(
			       json_build_object(
			         'id', c.id,
			         'timestamp', c.timestamp,
			         'distance', c.distance,
			         'type', c.type
			       ) ORDER BY c.timestamp
			     ) FILTER (WHERE c.id IS NOT NULL),
			     '[]'::json
			   ) AS checkpoints
			 FROM shifts s
			 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			 LEFT JOIN checkpoints c ON c.shift_id = s.id
			 JOIN athletes a         ON a.id = s.athlete_id
			 JOIN teams t            ON t.id = a.team_id
			 WHERE s.athlete_id = $1 AND s.status = 'completed'
			   ${eventCond}
			 GROUP BY s.id, tr.number
			 ORDER BY s.start_at DESC`,
			params
		);
		return result.rows;
	},
};
