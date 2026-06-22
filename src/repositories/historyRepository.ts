import { pool } from "../database/connection";

export interface HistoryFilters {
	event_id: number;
	team_id?: number;
	treadmill_id?: number;
	athlete_id?: number;
}

export const historyRepository = {
	async findByEvent(filters: HistoryFilters) {
		const params: number[] = [filters.event_id];
		let idx = 2;

		let teamCond = "";
		if (filters.team_id != null) {
			teamCond = `AND t.id = $${idx++}`;
			params.push(filters.team_id);
		}

		let treadmillCond = "";
		if (filters.treadmill_id != null) {
			treadmillCond = `AND s.treadmill_id = $${idx++}`;
			params.push(filters.treadmill_id);
		}

		let athleteCond = "";
		if (filters.athlete_id != null) {
			athleteCond = `AND a.id = $${idx++}`;
			params.push(filters.athlete_id);
		}

		const sharedWhere = `
			t.event_id = $1
			AND a.deleted_at IS NULL
			AND t.deleted_at IS NULL
			${teamCond} ${treadmillCond} ${athleteCond}
		`;

		const query = `
			SELECT
				'shift_start'  AS entry_type,
				s.start_at     AS timestamp,
				s.id           AS shift_id,
				a.id           AS athlete_id,
				a.name         AS athlete_name,
				t.id           AS team_id,
				t.name         AS team_name,
				tr.id          AS treadmill_id,
				tr.number      AS treadmill_number,
				NULL::NUMERIC  AS distance,
				NULL::VARCHAR  AS checkpoint_type,
				s.km_start,
				s.km_end,
				s.end_at,
				s.pace,
				COALESCE(au.name, mg.name) AS auditor_name
			FROM shifts s
			JOIN athletes a    ON a.id = s.athlete_id
			JOIN teams t       ON t.id = a.team_id
			LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			LEFT JOIN auditors au   ON au.id = s.auditor_id
			LEFT JOIN managers mg   ON mg.id = s.manager_id
			WHERE ${sharedWhere}
			  AND s.status = 'completed'

			UNION ALL

			SELECT
				'checkpoint',
				c.timestamp,
				c.shift_id,
				a.id, a.name,
				t.id, t.name,
				tr.id, tr.number,
				c.distance,
				c.type,
				NULL, NULL, NULL,
				COALESCE(au.name, mg.name)
			FROM checkpoints c
			JOIN shifts s      ON s.id = c.shift_id
			JOIN athletes a    ON a.id = s.athlete_id
			JOIN teams t       ON t.id = a.team_id
			LEFT JOIN treadmills tr ON tr.id = s.treadmill_id
			LEFT JOIN auditors au   ON au.id = s.auditor_id
			LEFT JOIN managers mg   ON mg.id = s.manager_id
			WHERE ${sharedWhere}
			  AND s.status = 'completed'

			ORDER BY shift_id DESC, timestamp ASC
		`;

		const result = await pool.query(query, params);
		return result.rows;
	},
};
