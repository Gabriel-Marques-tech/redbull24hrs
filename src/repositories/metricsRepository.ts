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

	async dashboardStats(eventId: number) {
		const [topShiftsRes, kmByHourRes, topByPeriodRes, topByGenderRes, rythymRes] = await Promise.all([
			// Top 5 turnos por distância
			pool.query(
				`SELECT s.id, s.distance, s.start_at, s.end_at,
				        EXTRACT(EPOCH FROM s.total_time)::int AS duration_seconds,
				        a.name AS athlete_name, t.name AS team_name
				 FROM shifts s
				 JOIN athletes a ON a.id = s.athlete_id
				 JOIN teams t    ON t.id = a.team_id
				 WHERE t.event_id = $1 AND s.status = 'completed' AND s.distance > 0
				 ORDER BY s.distance DESC LIMIT 5`,
				[eventId]
			),
			// Km por equipe por hora do evento (para gráfico de linha acumulativo)
			pool.query(
				`WITH min_shift AS (
				   SELECT MIN(s2.start_at) AS t_min
				   FROM shifts s2
				   JOIN athletes a2 ON a2.id = s2.athlete_id
				   JOIN teams t2    ON t2.id = a2.team_id
				   WHERE t2.event_id = $1
				 ),
				 ref AS (
				   SELECT LEAST(
				              COALESCE(e.started_at, m.t_min),
				              COALESCE(m.t_min, e.started_at)
				          ) AS t0
				   FROM events e, min_shift m
				   WHERE e.id = $1
				 )
				 SELECT t.id AS team_id, t.name AS team_name,
				        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (s.end_at - r.t0)) / 3600))::int AS hour_bucket,
				        SUM(s.distance) AS km_in_bucket
				 FROM shifts s
				 JOIN athletes a ON a.id = s.athlete_id
				 JOIN teams t    ON t.id = a.team_id
				 CROSS JOIN ref r
				 WHERE t.event_id = $1 AND s.status = 'completed' AND r.t0 IS NOT NULL
				 GROUP BY t.id, t.name, hour_bucket
				 ORDER BY t.id, hour_bucket ASC`,
				[eventId]
			),
			// Top atleta por período do dia (madrugada/manhã/tarde/noite)
			pool.query(
				`SELECT
				        CASE
				          WHEN EXTRACT(HOUR FROM s.end_at AT TIME ZONE 'America/Sao_Paulo') < 6  THEN 'Madrugada'
				          WHEN EXTRACT(HOUR FROM s.end_at AT TIME ZONE 'America/Sao_Paulo') < 12 THEN 'Manhã'
				          WHEN EXTRACT(HOUR FROM s.end_at AT TIME ZONE 'America/Sao_Paulo') < 18 THEN 'Tarde'
				          ELSE 'Noite'
				        END AS periodo,
				        a.id AS athlete_id, a.name AS athlete_name, t.name AS team_name,
				        SUM(s.distance) AS km_periodo,
				        COUNT(s.id)::int AS turnos_periodo
				 FROM shifts s
				 JOIN athletes a ON a.id = s.athlete_id
				 JOIN teams t    ON t.id = a.team_id
				 WHERE t.event_id = $1 AND s.status = 'completed'
				 GROUP BY periodo, a.id, a.name, t.name
				 ORDER BY periodo, km_periodo DESC`,
				[eventId]
			),
			// Top 3 por gênero
			pool.query(
				`SELECT a.gender,
				        a.name AS athlete_name,
				        t.name AS team_name,
				        COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km,
				        COUNT(s.id)              FILTER (WHERE s.status = 'completed')     AS shift_count,
				        ROW_NUMBER() OVER (
				            PARTITION BY a.gender
				            ORDER BY COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) DESC
				        ) AS rank
				 FROM athletes a
				 JOIN teams t ON t.id = a.team_id
				 LEFT JOIN shifts s ON s.athlete_id = a.id
				 WHERE t.event_id = $1 AND a.deleted_at IS NULL AND a.gender IS NOT NULL AND a.gender <> ''
				 GROUP BY a.gender, a.id, a.name, t.name`,
				[eventId]
			),
			// Km total + elapsed para projeção
			pool.query(
				`WITH min_shift AS (
				   SELECT MIN(s2.start_at) AS t_min
				   FROM shifts s2
				   JOIN athletes a2 ON a2.id = s2.athlete_id
				   JOIN teams t2    ON t2.id = a2.team_id
				   WHERE t2.event_id = $1
				 ),
				 ref AS (
				   SELECT e.status, e.finished_at,
				          LEAST(
				              COALESCE(e.started_at, m.t_min),
				              COALESCE(m.t_min, e.started_at)
				          ) AS t0
				   FROM events e, min_shift m
				   WHERE e.id = $1
				 )
				 SELECT
				   COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km,
				   EXTRACT(EPOCH FROM (COALESCE(r.finished_at, NOW()) - r.t0)) / 3600.0 AS elapsed_hours,
				   r.status AS event_status
				 FROM ref r
				 LEFT JOIN teams t    ON t.event_id = $1 AND t.deleted_at IS NULL
				 LEFT JOIN athletes a ON a.team_id = t.id AND a.deleted_at IS NULL
				 LEFT JOIN shifts s   ON s.athlete_id = a.id
				 GROUP BY r.t0, r.finished_at, r.status`,
				[eventId]
			),
		]);

		const rythym     = rythymRes.rows[0] ?? { total_km: 0, elapsed_hours: 0, event_status: 'finished' };
		const elapsedH   = Math.max(0.01, isFinite(Number(rythym.elapsed_hours)) ? Number(rythym.elapsed_hours) : 0.01);
		const totalKm    = Number(rythym.total_km) || 0;
		const rateKmH    = totalKm / elapsedH;
		const isFinished = rythym.event_status === 'finished';
		const remaining  = isFinished ? 0 : Math.max(0, 24 - elapsedH);
		const projectedKm = isFinished ? totalKm : Math.round(totalKm + rateKmH * remaining);

		// top por período: apenas o 1° de cada período
		const topByPeriod: Record<string, any> = {};
		for (const r of topByPeriodRes.rows) {
			if (!topByPeriod[r.periodo]) topByPeriod[r.periodo] = r;
		}

		// km por hora por equipe: montar mapa { team_id: { name, buckets: {hour: km} } }
		const kmByHour: Record<number, { name: string; buckets: Record<number, number> }> = {};
		for (const r of kmByHourRes.rows) {
			if (!kmByHour[r.team_id]) kmByHour[r.team_id] = { name: r.team_name, buckets: {} };
			kmByHour[r.team_id].buckets[Number(r.hour_bucket)] = Number(r.km_in_bucket);
		}

		// top por gênero: agrupar { gender: [top3] }
		const topByGender: Record<string, any[]> = {};
		for (const r of topByGenderRes.rows) {
			if (Number(r.rank) <= 3) {
				if (!topByGender[r.gender]) topByGender[r.gender] = [];
				topByGender[r.gender].push(r);
			}
		}

		return {
			topShifts:    topShiftsRes.rows,
			kmByHour,
			topByPeriod,
			topByGender,
			projectedKm:  isFinite(projectedKm) ? projectedKm : null,
			totalKm,
			elapsedHours: isFinite(elapsedH) && elapsedH > 0.01 ? Math.round(elapsedH * 10) / 10 : null,
			rateKmH:      isFinite(rateKmH) && rateKmH < 99999 ? Math.round(rateKmH * 10) / 10 : null,
		};
	},

	async teamStatsByEvent(eventId: number) {
		const [teamsRes, topRes] = await Promise.all([
			pool.query(
				`SELECT t.id, t.name,
				        COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0)  AS total_km,
				        COUNT(s.id)              FILTER (WHERE s.status = 'completed')       AS shift_count,
				        ROUND(AVG(s.speed)       FILTER (WHERE s.status = 'completed' AND s.speed > 0)::NUMERIC, 1) AS avg_speed,
				        ROUND(AVG(EXTRACT(EPOCH FROM s.total_time) / NULLIF(s.distance, 0))
				              FILTER (WHERE s.status = 'completed' AND s.distance > 0))     AS avg_pace_seconds
				 FROM teams t
				 LEFT JOIN athletes a ON a.team_id = t.id AND a.deleted_at IS NULL
				 LEFT JOIN shifts s   ON s.athlete_id = a.id
				 WHERE t.event_id = $1 AND t.deleted_at IS NULL
				 GROUP BY t.id, t.name
				 ORDER BY total_km DESC`,
				[eventId]
			),
			pool.query(
				`SELECT DISTINCT ON (a.team_id)
				        a.team_id,
				        a.name AS athlete_name,
				        COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS athlete_km
				 FROM athletes a
				 JOIN teams t ON t.id = a.team_id
				 LEFT JOIN shifts s ON s.athlete_id = a.id
				 WHERE t.event_id = $1 AND a.deleted_at IS NULL
				 GROUP BY a.team_id, a.id, a.name
				 ORDER BY a.team_id, athlete_km DESC`,
				[eventId]
			),
		]);
		const topByTeam: Record<number, string> = {};
		for (const r of topRes.rows) topByTeam[r.team_id] = r.athlete_name;
		return teamsRes.rows.map((t: any) => ({ ...t, top_athlete: topByTeam[t.id] ?? '—' }));
	},

	async athleteStatsByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT a.id, a.name AS athlete_name, t.id AS team_id, t.name AS team_name,
			        COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km,
			        COUNT(s.id)              FILTER (WHERE s.status = 'completed')     AS shift_count
			 FROM athletes a
			 JOIN teams t ON t.id = a.team_id
			 LEFT JOIN shifts s ON s.athlete_id = a.id
			 WHERE t.event_id = $1 AND a.deleted_at IS NULL AND t.deleted_at IS NULL
			 GROUP BY a.id, a.name, t.id, t.name
			 ORDER BY t.id, total_km DESC`,
			[eventId]
		);
		return result.rows;
	},

	async genderKmByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT a.gender,
			        COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km
			 FROM athletes a
			 JOIN teams t ON t.id = a.team_id
			 LEFT JOIN shifts s ON s.athlete_id = a.id
			 WHERE t.event_id = $1 AND t.deleted_at IS NULL AND a.deleted_at IS NULL
			   AND a.gender IS NOT NULL AND a.gender <> ''
			 GROUP BY a.gender`,
			[eventId]
		);
		return result.rows;
	},

	// Soma de km de todos os turnos concluídos do evento (total coletivo do modo TV).
	async totalKmByEvent(eventId: number) {
		const result = await pool.query(
			`SELECT COALESCE(SUM(s.distance) FILTER (WHERE s.status = 'completed'), 0) AS total_km,
			        COUNT(s.id)              FILTER (WHERE s.status = 'completed')     AS completed_shifts
			 FROM shifts s
			 JOIN athletes a ON a.id = s.athlete_id
			 JOIN teams t    ON t.id = a.team_id
			 WHERE t.event_id = $1`,
			[eventId]
		);
		return result.rows[0];
	},

	// Pace médio (seg/km) do período de 6h vigente da competição.
	// Períodos por tempo restante: 0=24h–18h, 1=18h–12h, 2=12h–6h, 3=6h–0h (idx 3 aberto).
	// O período é ancorado na última atividade (checkpoint/turno), não no relógio, para
	// funcionar em eventos encerrados ou de teste que já passaram das 24h.
	// Fonte primária: segmentos entre checkpoints consecutivos do mesmo turno. Como muitos
	// turnos têm < 2 checkpoints, há fallback para o pace dos turnos concluídos (total_time/distance)
	// do período e, por fim, de todo o evento.
	async pacePeriodByEvent(eventId: number) {
		const result = await pool.query(
			`WITH min_shift AS (
			   SELECT MIN(s2.start_at) AS t_min
			   FROM shifts s2
			   JOIN athletes a2 ON a2.id = s2.athlete_id
			   JOIN teams t2    ON t2.id = a2.team_id
			   WHERE t2.event_id = $1
			 ),
			 ref AS (
			   SELECT e.status, e.finished_at,
			          LEAST(
			              COALESCE(e.started_at, m.t_min),
			              COALESCE(m.t_min, e.started_at)
			          ) AS t0
			   FROM events e, min_shift m
			   WHERE e.id = $1
			 ),
			 cps AS (
			   SELECT c.timestamp, c.distance,
			          LAG(c.distance)  OVER (PARTITION BY c.shift_id ORDER BY c.timestamp, c.id) AS prev_dist,
			          LAG(c.timestamp) OVER (PARTITION BY c.shift_id ORDER BY c.timestamp, c.id) AS prev_ts
			   FROM checkpoints c
			   JOIN shifts s    ON s.id = c.shift_id
			   JOIN athletes a  ON a.id = s.athlete_id
			   JOIN teams t     ON t.id = a.team_id
			   WHERE t.event_id = $1
			 ),
			 last_act AS (
			   SELECT GREATEST(
			     COALESCE((SELECT MAX(timestamp) FROM cps), '-infinity'::timestamp),
			     COALESCE((
			       SELECT MAX(s.end_at)
			       FROM shifts s
			       JOIN athletes a ON a.id = s.athlete_id
			       JOIN teams t    ON t.id = a.team_id
			       WHERE t.event_id = $1 AND s.status = 'completed'
			     ), '-infinity'::timestamp)
			   ) AS ts
			 ),
			 period AS (
			   SELECT r.t0, r.status,
			          (CASE WHEN la.ts > '-infinity'::timestamp THEN la.ts
			                ELSE COALESCE(r.finished_at, NOW()) END) AS ref_now
			   FROM ref r, last_act la
			 ),
			 calc AS (
			   SELECT t0, status,
			          GREATEST(0, EXTRACT(EPOCH FROM (ref_now - t0)) / 3600.0) AS elapsed_h,
			          LEAST(3, GREATEST(0,
			              FLOOR(EXTRACT(EPOCH FROM (ref_now - t0)) / 3600.0 / 6)
			          ))::int AS idx
			   FROM period
			 )
			 SELECT
			   p.idx                            AS period_idx,
			   ROUND(p.elapsed_h::numeric, 2)   AS elapsed_hours,
			   p.status                         AS event_status,
			   (SELECT AVG(EXTRACT(EPOCH FROM (c.timestamp - c.prev_ts)) / NULLIF(c.distance - c.prev_dist, 0))
			      FROM cps c
			      WHERE c.prev_dist IS NOT NULL AND c.distance > c.prev_dist
			        AND c.timestamp >= p.t0 + (p.idx * 6) * INTERVAL '1 hour'
			        AND (p.idx >= 3 OR c.timestamp < p.t0 + ((p.idx + 1) * 6) * INTERVAL '1 hour')
			   ) AS checkpoint_sec_per_km,
			   (SELECT AVG(EXTRACT(EPOCH FROM s.total_time) / NULLIF(s.distance, 0))
			      FROM shifts s
			      JOIN athletes a ON a.id = s.athlete_id
			      JOIN teams t    ON t.id = a.team_id
			      WHERE t.event_id = $1 AND s.status = 'completed'
			        AND s.distance > 0 AND s.total_time IS NOT NULL
			        AND s.end_at >= p.t0 + (p.idx * 6) * INTERVAL '1 hour'
			        AND (p.idx >= 3 OR s.end_at < p.t0 + ((p.idx + 1) * 6) * INTERVAL '1 hour')
			   ) AS shift_sec_per_km,
			   (SELECT AVG(EXTRACT(EPOCH FROM s.total_time) / NULLIF(s.distance, 0))
			      FROM shifts s
			      JOIN athletes a ON a.id = s.athlete_id
			      JOIN teams t    ON t.id = a.team_id
			      WHERE t.event_id = $1 AND s.status = 'completed'
			        AND s.distance > 0 AND s.total_time IS NOT NULL
			   ) AS overall_sec_per_km
			 FROM calc p`,
			[eventId]
		);
		return result.rows[0];
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
