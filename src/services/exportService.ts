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

function fmtDate(v: unknown): string {
	if (!v) return "";
	const d = new Date(v as any);
	if (isNaN(d.getTime())) return String(v);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtInterval(v: unknown): string {
	if (!v) return "";
	if (typeof v === "string") {
		// formato "HH:MM:SS.ms" — trunca milissegundos
		return v.split(".")[0];
	}
	if (typeof v === "object") {
		const iv = v as any;
		const h = String(Math.floor(iv.hours   || 0)).padStart(2, "0");
		const m = String(Math.floor(iv.minutes || 0)).padStart(2, "0");
		const s = String(Math.floor(iv.seconds || 0)).padStart(2, "0");
		return `${h}:${m}:${s}`;
	}
	return String(v);
}

function transformShift(r: Record<string, unknown>): Record<string, unknown> {
	return {
		"ID":              r.id,
		"Status":          r.status,
		"Início":          fmtDate(r.start_at),
		"Fim":             fmtDate(r.end_at),
		"Duração (hh:mm:ss)": fmtInterval(r.total_time),
		"Km início":       r.km_start,
		"Km fim":          r.km_end,
		"Distância (km)":  r.distance,
		"Velocidade (km/h)": r.speed,
		"Atleta":          r.athlete_name,
		"CPF":             r.athlete_cpf,
		"Equipe":          r.team_name,
		"Esteira":         r.treadmill_number,
		"Auditor":         r.auditor_name,
	};
}

function transformCheckpoint(r: Record<string, unknown>): Record<string, unknown> {
	return {
		"ID":            r.id,
		"Horário":       fmtDate(r.timestamp),
		"Distância (km)": r.distance,
		"Tipo":          r.type,
		"Turno ID":      r.shift_id,
		"Atleta":        r.athlete_name,
		"Equipe":        r.team_name,
		"Esteira":       r.treadmill_number,
	};
}

export const exportService = {
	async shiftsCsv(eventId: number): Promise<string> {
		const rows = await exportRepository.shiftsByEvent(eventId);
		return rowsToCsv(rows.map(transformShift));
	},

	async checkpointsCsv(eventId: number): Promise<string> {
		const rows = await exportRepository.checkpointsByEvent(eventId);
		return rowsToCsv(rows.map(transformCheckpoint));
	},
};
