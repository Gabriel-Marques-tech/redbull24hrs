import { exportRepository } from "../repositories/exportRepository";

function rowsToCsv(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return "";
	const headers = Object.keys(rows[0]);
	const escape = (v: unknown): string => {
		const s = v == null ? "" : String(v);
		return s.includes(",") || s.includes('"') || s.includes("\n")
			? `"${s.replace(/"/g, '""')}"`
			: s;
	};
	const lines = [
		headers.join(","),
		...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
	];
	return lines.join("\n");
}

export const exportService = {
	async shiftsCsv(eventId: number): Promise<string> {
		const rows = await exportRepository.shiftsByEvent(eventId);
		return rowsToCsv(rows);
	},

	async checkpointsCsv(eventId: number): Promise<string> {
		const rows = await exportRepository.checkpointsByEvent(eventId);
		return rowsToCsv(rows);
	},
};
