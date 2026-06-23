import { pool } from "../database/connection";

export const shareRepository = {
	async generateTokensForEvent(eventId: number): Promise<void> {
		await pool.query(
			`UPDATE athletes a
			 SET share_token = gen_random_uuid()
			 FROM teams t
			 WHERE a.team_id = t.id
			   AND t.event_id = $1
			   AND a.deleted_at IS NULL
			   AND a.share_token IS NULL`,
			[eventId]
		);
	},

	async athletesByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT
			   a.id, a.name, a.email, a.share_token,
			   t.name AS team_name,
			   COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km,
			   COUNT(s.id)              FILTER (WHERE s.status = 'completed')     AS total_shifts
			 FROM athletes a
			 JOIN teams t ON t.id = a.team_id
			 LEFT JOIN shifts s ON s.athlete_id = a.id
			 WHERE t.event_id = $1 AND a.deleted_at IS NULL
			 GROUP BY a.id, a.name, a.email, a.share_token, t.name
			 ORDER BY t.name, a.name`,
			[eventId]
		);
		return result.rows;
	},

	async athleteCardByToken(shareToken: string) {
		const result = await pool.query(
			`SELECT
			   a.id,
			   a.name,
			   a.gender,
			   a.share_token,
			   t.name AS team_name,
			   e.id   AS event_id,
			   e.name AS event_name,
			   COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0)                          AS total_km,
			   COUNT(s.id)              FILTER (WHERE s.status = 'completed')                              AS total_shifts,
			   ROUND(AVG(s.speed)       FILTER (WHERE s.status = 'completed' AND s.speed > 0)::NUMERIC, 1) AS avg_speed,
			   MAX(s.distance)          FILTER (WHERE s.status = 'completed')                              AS best_shift_km
			 FROM athletes a
			 JOIN teams t  ON t.id  = a.team_id
			 JOIN events e ON e.id  = t.event_id
			 LEFT JOIN shifts s ON s.athlete_id = a.id
			 WHERE a.share_token = $1 AND a.deleted_at IS NULL
			 GROUP BY a.id, a.name, a.gender, a.share_token, t.name, e.id, e.name`,
			[shareToken]
		);
		return result.rows[0] ?? null;
	},
};
