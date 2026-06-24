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

	async eventStatusByAthlete(athlete_id: number): Promise<{ status: string; paused_at: string | null } | null> {
		const result = await pool.query(
			`SELECT e.status, e.paused_at
			 FROM athletes a
			 JOIN teams t  ON t.id = a.team_id
			 JOIN events e ON e.id = t.event_id
			 WHERE a.id = $1`,
			[athlete_id]
		);
		return result.rows[0] ?? null;
	},

	async eventStatusByShift(shift_id: number): Promise<{ status: string; paused_at: string | null } | null> {
		const result = await pool.query(
			`SELECT e.status, e.paused_at
			 FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 JOIN teams t    ON t.id = a.team_id
			 JOIN events e   ON e.id = t.event_id
			 WHERE s.id = $1`,
			[shift_id]
		);
		return result.rows[0] ?? null;
	},

	async treadmillExists(treadmill_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM treadmills WHERE id = $1`, [treadmill_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async auditorExists(auditor_id: number): Promise<boolean> {
		const auditor = await pool.query(`SELECT 1 FROM auditors WHERE id = $1`, [auditor_id]);
		if ((auditor.rowCount ?? 0) > 0) return true;
		const manager = await pool.query(`SELECT 1 FROM managers WHERE id = $1`, [auditor_id]);
		return (manager.rowCount ?? 0) > 0;
	},

	async findOpenByAthlete(athlete_id: number) {
		const result = await pool.query(
			`SELECT * FROM shifts WHERE athlete_id = $1 AND status = 'in_progress' LIMIT 1`,
			[athlete_id]
		);
		return result.rows[0] ?? null;
	},

	async findOpenByTeam(athlete_id: number) {
		const result = await pool.query(
			`SELECT s.id FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 WHERE a.team_id = (SELECT team_id FROM athletes WHERE id = $1)
			   AND s.status = 'in_progress'
			 LIMIT 1`,
			[athlete_id]
		);
		return result.rows[0] ?? null;
	},

	async findOpenByTreadmill(treadmill_id: number) {
		const result = await pool.query(
			`SELECT *,
			        FLOOR(EXTRACT(EPOCH FROM (NOW() - start_at)))::int AS elapsed_seconds
			 FROM shifts
			 WHERE treadmill_id = $1 AND status = 'in_progress'
			 LIMIT 1`,
			[treadmill_id]
		);
		return result.rows[0] ?? null;
	},

	async findOpenByTeamWithDetails(athlete_id: number) {
		const result = await pool.query(
			`SELECT s.id, s.start_at, s.km_start, s.treadmill_id,
			        a.name AS athlete_name, te.name AS team_name, tr.number AS treadmill_number,
			        COALESCE(MAX(c.timestamp), s.start_at) AS last_activity
			 FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 JOIN teams te ON te.id = a.team_id
			 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			 LEFT JOIN checkpoints c ON c.shift_id = s.id
			 WHERE a.team_id = (SELECT team_id FROM athletes WHERE id = $1)
			   AND s.status = 'in_progress'
			 GROUP BY s.id, a.name, te.name, tr.number
			 LIMIT 1`,
			[athlete_id]
		);
		return result.rows[0] ?? null;
	},

	async findAllOpen() {
		const result = await pool.query(
			`SELECT s.id, s.start_at, s.km_start, s.treadmill_id,
			        a.name AS athlete_name, te.name AS team_name, tr.number AS treadmill_number,
			        COALESCE(au.name, mg.name) AS operator_name,
			        CASE WHEN s.auditor_id IS NOT NULL THEN 'auditor' ELSE 'manager' END AS operator_role,
			        COALESCE(MAX(c.timestamp), s.start_at) AS last_activity,
			        EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(c.timestamp), s.start_at))) / 60 AS idle_minutes
			 FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 JOIN teams te ON te.id = a.team_id
			 LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			 LEFT JOIN auditors au ON au.id = s.auditor_id
			 LEFT JOIN managers mg ON mg.id = s.manager_id
			 LEFT JOIN checkpoints c ON c.shift_id = s.id
			 WHERE s.status = 'in_progress'
			 GROUP BY s.id, a.name, te.name, tr.number, au.name, mg.name
			 ORDER BY s.start_at ASC`
		);
		return result.rows;
	},

	async start(athlete_id: number, operator_id: number, operator_role: 'auditor' | 'manager', treadmill_id: number, km_start: number) {
		const idCol = operator_role === 'manager' ? 'manager_id' : 'auditor_id'

		const result = await pool.query(
			`INSERT INTO shifts (status, athlete_id, ${idCol}, treadmill_id, start_at, km_start, km_end, distance, speed)
			 VALUES ('in_progress', $1, $2, $3, NOW(), $4, $4, 0, 0)
			 RETURNING *`,
			[athlete_id, operator_id, treadmill_id, km_start]
		);
		const shift = result.rows[0];

		// RF024/RN23: registra abertura do turno na trilha de auditoria
		await pool.query(
			`INSERT INTO logs (shift_id, type, author_id, author_role) VALUES ($1, 'created', $2, $3)`,
			[shift.id, operator_id, operator_role]
		);

		return shift;
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

	async listCheckpointsByShift(shift_id: number) {
		const result = await pool.query(
			`SELECT c.id, c.distance, c.timestamp, c.type,
			        COALESCE(au.name, mg.name) AS auditor_name
			 FROM checkpoints c
			 JOIN shifts s        ON s.id = c.shift_id
			 LEFT JOIN auditors au ON au.id = s.auditor_id
			 LEFT JOIN managers mg ON mg.id = s.manager_id
			 WHERE c.shift_id = $1
			 ORDER BY c.timestamp ASC`,
			[shift_id]
		);
		return result.rows;
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

	async abandon(id: number, forceClose = false) {
		await pool.query(
			`UPDATE shifts
			 SET status = 'completed',
			     end_at = NOW(),
			     km_end = km_start,
			     distance = 0,
			     total_time = NOW() - start_at,
			     speed = 0
			 WHERE id = $1 AND status = 'in_progress'`,
			[id]
		);
		const logType = forceClose ? 'force_closed' : 'abandoned';
		await pool.query(
			`INSERT INTO logs (shift_id, type) VALUES ($1, $2)`,
			[id, logType]
		);
	},

	async adminUpdate(
		id: number,
		fields: { athlete_id?: number; km_start: number; km_end: number; start_at?: string; end_at?: string | null }
	) {
		const result = await pool.query(
			`UPDATE shifts SET
			     athlete_id = COALESCE($2::int, athlete_id),
			     km_start   = $3::numeric,
			     km_end     = $4::numeric,
			     distance   = $4::numeric - $3::numeric,
			     start_at   = COALESCE($5::timestamp, start_at),
			     end_at     = CASE WHEN $6::text IS NULL OR $6::text = '' THEN end_at ELSE $6::timestamp END,
			     total_time = CASE
			                    WHEN ($6::text IS NULL OR $6::text = '') THEN total_time
			                    ELSE $6::timestamp - COALESCE($5::timestamp, start_at)
			                  END,
			     speed = CASE
			               WHEN ($6::text IS NOT NULL AND $6::text <> '')
			                    AND EXTRACT(EPOCH FROM ($6::timestamp - COALESCE($5::timestamp, start_at))) > 0
			               THEN ROUND(($4::numeric - $3::numeric) / (EXTRACT(EPOCH FROM ($6::timestamp - COALESCE($5::timestamp, start_at)))::numeric / 3600.0))
			               WHEN total_time IS NOT NULL AND EXTRACT(EPOCH FROM total_time) > 0
			               THEN ROUND(($4::numeric - $3::numeric) / (EXTRACT(EPOCH FROM total_time)::numeric / 3600.0))
			               ELSE 0
			             END
			 WHERE id = $1
			 RETURNING *`,
			[id, fields.athlete_id ?? null, fields.km_start, fields.km_end, fields.start_at ?? null, fields.end_at ?? null]
		);
		const shift = result.rows[0] ?? null;
		if (shift) {
			await pool.query(`INSERT INTO logs (shift_id, type) VALUES ($1, 'updated')`, [shift.id]);
		}
		return shift;
	},

	async reassignAthlete(shift_id: number, athlete_id: number) {
		await pool.query(
			`UPDATE shifts SET athlete_id = $1 WHERE id = $2 AND status = 'in_progress'`,
			[athlete_id, shift_id]
		);
	},

	async finish(id: number, km_end: number, duration_seconds?: number) {
		// Quando há duração editada, calcula end_at = start_at + duração no SQL.
		// Tudo no domínio do Postgres → zero conversão de timezone (TIMESTAMP sem tz).
		const [sql, params] = duration_seconds != null
			? [
				`UPDATE shifts
				 SET status = 'completed',
				     end_at = start_at + ($3 * interval '1 second'),
				     km_end = $1,
				     distance = $1 - km_start,
				     total_time = $3 * interval '1 second',
				     speed = CASE
				               WHEN $3 > 0
				               THEN ROUND(($1 - km_start) / ($3 / 3600.0))
				               ELSE 0
				             END
				 WHERE id = $2 AND status = 'in_progress'
				 RETURNING *`,
				[km_end, id, duration_seconds]
			  ]
			: [
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
			  ];
		const result = await pool.query(sql, params);
		const shift = result.rows[0] ?? null;

		// RF024/RN23: registra encerramento do turno na trilha de auditoria
		if (shift) {
			await pool.query(
				`INSERT INTO logs (shift_id, type) VALUES ($1, 'finished')`,
				[shift.id]
			);
		}

		return shift;
	},
};
