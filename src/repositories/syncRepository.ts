import { pool } from "../database/connection";

export interface SyncRecord {
	sync_id: string;
	shift_id: number;
	distance: number;
	checkpoint_type: string;
	timestamp: string;
}

export const syncRepository = {
	async shiftExists(shift_id: number): Promise<boolean> {
		const result = await pool.query(
			`SELECT status FROM shifts WHERE id = $1`,
			[shift_id]
		);
		return (result.rowCount ?? 0) > 0;
	},

	async shiftIsActive(shift_id: number): Promise<boolean> {
		const result = await pool.query(
			`SELECT 1 FROM shifts WHERE id = $1 AND status = 'in_progress'`,
			[shift_id]
		);
		return (result.rowCount ?? 0) > 0;
	},

	// Insere checkpoint com timestamp original. ON CONFLICT (sync_id) DO NOTHING = idempotente.
	// Retorna true se inserido, false se sync_id já existia (duplicata ignorada).
	async insertCheckpoint(record: SyncRecord): Promise<boolean> {
		const result = await pool.query(
			`INSERT INTO checkpoints (shift_id, distance, type, timestamp, sync_id)
			 VALUES ($1, $2, $3, $4::timestamptz, $5)
			 ON CONFLICT (sync_id) WHERE sync_id IS NOT NULL DO NOTHING`,
			[record.shift_id, record.distance, record.checkpoint_type, record.timestamp, record.sync_id]
		);
		return (result.rowCount ?? 0) > 0;
	},
};
