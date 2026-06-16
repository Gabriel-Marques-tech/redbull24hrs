import ExcelJS from "exceljs";
import { exportRepository } from "../repositories/exportRepository";

// ── helpers de formatação (iguais aos originais) ──────────────────────────────

function fmtDate(v: unknown): string {
	if (!v) return "";
	const d = new Date(v as any);
	if (isNaN(d.getTime())) return String(v);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtInterval(v: unknown): string {
	if (!v) return "";
	if (typeof v === "string") return v.split(".")[0];
	if (typeof v === "object") {
		const iv = v as any;
		const h = String(Math.floor(iv.hours   || 0)).padStart(2, "0");
		const m = String(Math.floor(iv.minutes || 0)).padStart(2, "0");
		const s = String(Math.floor(iv.seconds || 0)).padStart(2, "0");
		return `${h}:${m}:${s}`;
	}
	return String(v);
}

// ── estilos ───────────────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFD4001E" }, // vermelho Red Bull
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
	bold: true,
	color: { argb: "FFFFFFFF" },
	size: 11,
	name: "Arial",
};

const CELL_FONT: Partial<ExcelJS.Font> = {
	name: "Arial",
	size: 10,
};

const BORDER: Partial<ExcelJS.Borders> = {
	top:    { style: "thin", color: { argb: "FFD0D0D0" } },
	left:   { style: "thin", color: { argb: "FFD0D0D0" } },
	bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
	right:  { style: "thin", color: { argb: "FFD0D0D0" } },
};

const ZEBRA_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFF5F5F5" }, // cinza clarinho para linhas pares
};

// ── função que cria e estiliza a planilha ─────────────────────────────────────

function buildWorksheet(
	wb: ExcelJS.Workbook,
	sheetName: string,
	columns: { header: string; key: string; width?: number }[],
	rows: Record<string, unknown>[],
): ExcelJS.Worksheet {
	const ws = wb.addWorksheet(sheetName);

	// define colunas (isso cria o cabeçalho automaticamente)
	ws.columns = columns.map((c) => ({
		header: c.header,
		key:    c.key,
		width:  c.width ?? 18,
	}));

	// estiliza linha de cabeçalho
	const headerRow = ws.getRow(1);
	headerRow.height = 22;
	headerRow.eachCell((cell) => {
		cell.fill   = HEADER_FILL;
		cell.font   = HEADER_FONT;
		cell.border = BORDER;
		cell.alignment = { vertical: "middle", horizontal: "center" };
	});

	// adiciona as linhas de dados
	rows.forEach((row, i) => {
		const dataRow = ws.addRow(row);
		dataRow.height = 18;
		dataRow.eachCell({ includeEmpty: true }, (cell) => {
			cell.font   = CELL_FONT;
			cell.border = BORDER;
			cell.alignment = { vertical: "middle" };
			// zebra: linhas pares recebem fundo levemente cinza
			if (i % 2 === 1) cell.fill = ZEBRA_FILL;
		});
	});

	// freeze na primeira linha (cabeçalho fixo ao rolar)
	ws.views = [{ state: "frozen", ySplit: 1 }];

	// filtro automático no cabeçalho
	ws.autoFilter = {
		from: { row: 1, column: 1 },
		to:   { row: 1, column: columns.length },
	};

	return ws;
}

// ── transforms (igual ao original, mas retorna Record<string, unknown>) ───────

function transformShift(r: Record<string, unknown>): Record<string, unknown> {
	return {
		id:         r.id,
		status:     r.status,
		start_at:   fmtDate(r.start_at),
		end_at:     fmtDate(r.end_at),
		total_time: fmtInterval(r.total_time),
		km_start:   r.km_start,
		km_end:     r.km_end,
		distance:   r.distance,
		speed:      r.speed,
		athlete:    r.athlete_name,
		cpf:        r.athlete_cpf,
		team:       r.team_name,
		treadmill:  r.treadmill_number,
		auditor:    r.auditor_name,
	};
}

function transformCheckpoint(r: Record<string, unknown>): Record<string, unknown> {
	return {
		id:        r.id,
		timestamp: fmtDate(r.timestamp),
		distance:  r.distance,
		type:      r.type,
		shift_id:  r.shift_id,
		athlete:   r.athlete_name,
		team:      r.team_name,
		treadmill: r.treadmill_number,
	};
}

// ── colunas de cada aba ───────────────────────────────────────────────────────

const SHIFT_COLUMNS = [
	{ header: "ID",                  key: "id",         width: 10 },
	{ header: "Status",              key: "status",     width: 14 },
	{ header: "Início",              key: "start_at",   width: 20 },
	{ header: "Fim",                 key: "end_at",     width: 20 },
	{ header: "Duração (hh:mm:ss)", key: "total_time", width: 18 },
	{ header: "Km início",           key: "km_start",   width: 12 },
	{ header: "Km fim",              key: "km_end",     width: 12 },
	{ header: "Distância (km)",      key: "distance",   width: 15 },
	{ header: "Velocidade (km/h)",   key: "speed",      width: 18 },
	{ header: "Atleta",              key: "athlete",    width: 24 },
	{ header: "CPF",                 key: "cpf",        width: 16 },
	{ header: "Equipe",              key: "team",       width: 20 },
	{ header: "Esteira",             key: "treadmill",  width: 12 },
	{ header: "Auditor",             key: "auditor",    width: 20 },
];

const CHECKPOINT_COLUMNS = [
	{ header: "ID",             key: "id",        width: 10 },
	{ header: "Horário",        key: "timestamp", width: 20 },
	{ header: "Distância (km)", key: "distance",  width: 15 },
	{ header: "Tipo",           key: "type",      width: 14 },
	{ header: "Turno ID",       key: "shift_id",  width: 12 },
	{ header: "Atleta",         key: "athlete",   width: 24 },
	{ header: "Equipe",         key: "team",      width: 20 },
	{ header: "Esteira",        key: "treadmill", width: 12 },
];

// ── service público ───────────────────────────────────────────────────────────

export const exportService = {
	async shiftsXlsx(eventId: number): Promise<Buffer> {
		const rows = await exportRepository.shiftsByEvent(eventId);
		const wb = new ExcelJS.Workbook();
		wb.creator = "RedRun";
		buildWorksheet(wb, "Turnos", SHIFT_COLUMNS, rows.map(transformShift));
		return Buffer.from(await wb.xlsx.writeBuffer());
	},

	async checkpointsXlsx(eventId: number): Promise<Buffer> {
		const rows = await exportRepository.checkpointsByEvent(eventId);
		const wb = new ExcelJS.Workbook();
		wb.creator = "RedRun";
		buildWorksheet(wb, "Checkpoints", CHECKPOINT_COLUMNS, rows.map(transformCheckpoint));
		return Buffer.from(await wb.xlsx.writeBuffer());
	},
};