import { pool } from "../database/connection";

export const imageRepository = {
	async setShiftImage(shift_id: number, image_url: string) {
		const result = await pool.query(
			`UPDATE shifts SET image_url = $1 WHERE id = $2 RETURNING *`,
			[image_url, shift_id]
		);
		return result.rows[0] ?? null;
	},

	async setCheckpointImage(checkpoint_id: number, image_url: string) {
		const result = await pool.query(
			`UPDATE checkpoints SET image_url = $1 WHERE id = $2 RETURNING *`,
			[image_url, checkpoint_id]
		);
		return result.rows[0] ?? null;
	},

	async shiftExists(shift_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM shifts WHERE id = $1`, [shift_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async checkpointExists(checkpoint_id: number): Promise<boolean> {
		const result = await pool.query(`SELECT 1 FROM checkpoints WHERE id = $1`, [checkpoint_id]);
		return (result.rowCount ?? 0) > 0;
	},

	async setShiftOcr(shift_id: number, ocr: { speed: number | null; distance: number | null; pace: string | null; time: string | null }) {
		await pool.query(
			`UPDATE shifts SET ocr_speed=$1, ocr_distance=$2, ocr_pace=$3, ocr_time=$4 WHERE id=$5`,
			[ocr.speed, ocr.distance, ocr.pace, ocr.time, shift_id]
		);
	},

	async setCheckpointOcr(checkpoint_id: number, ocr: { speed: number | null; distance: number | null; pace: string | null; time: string | null }) {
		await pool.query(
			`UPDATE checkpoints SET ocr_speed=$1, ocr_distance=$2, ocr_pace=$3, ocr_time=$4 WHERE id=$5`,
			[ocr.speed, ocr.distance, ocr.pace, ocr.time, checkpoint_id]
		);
	},
};
