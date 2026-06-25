import request from "supertest";
import ExcelJS from "exceljs";
import app from "../app";

jest.mock("../middlewares/authMiddleware", () => ({
	__esModule: true,
	default: {
		requireAuth: (_req: any, _res: any, next: any) => next(),
		requireRole: () => (_req: any, _res: any, next: any) => next(),
		requirePageAuth: (_req: any, _res: any, next: any) => next(),
	},
}));

jest.mock("../repositories/exportRepository", () => ({
	exportRepository: {
		shiftsByEvent: jest.fn(),
		checkpointsByEvent: jest.fn(),
	},
}));

import { exportRepository } from "../repositories/exportRepository";

const mockShiftRows = [
	{
		id: 1,
		status: "completed",
		start_at: "2026-06-01T08:00:00Z",
		end_at: "2026-06-01T08:30:00Z",
		total_time: "00:30:00",
		km_start: 100,
		km_end: 110,
		distance: 10,
		speed: 20,
		athlete_name: "João Silva",
		athlete_cpf: "12345678901",
		team_name: "Time A",
		treadmill_number: 5,
		auditor_name: "Carlos",
	},
];

const mockCheckpointRows = [
	{
		id: 1,
		timestamp: "2026-06-01T08:10:00Z",
		distance: 5,
		type: "mandatory",
		shift_id: 1,
		athlete_name: "João Silva",
		team_name: "Time A",
		treadmill_number: 5,
	},
];

// supertest/superagent não bufferiza respostas binárias por padrão;
// este parser acumula o corpo bruto em um Buffer para abrir como XLSX.
const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
	const chunks: Buffer[] = [];
	res.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
	res.on("end", () => callback(null, Buffer.concat(chunks)));
};

// Abre o buffer XLSX e devolve a primeira planilha.
const loadSheet = async (body: Buffer): Promise<ExcelJS.Worksheet> => {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(body as any);
	return wb.worksheets[0];
};

// Lê os valores (string) de uma linha, ignorando o índice 0 do ExcelJS.
const rowValues = (ws: ExcelJS.Worksheet, rowNumber: number): string[] => {
	const row = ws.getRow(rowNumber);
	const values = row.values as unknown[];
	return values.slice(1).map((v) => (v == null ? "" : String(v)));
};

beforeEach(() => jest.clearAllMocks());

// ─── GET /export/events/:eventId/shifts ───────────────────────────────────────

describe("GET /export/events/:eventId/shifts", () => {
	it("200 – retorna XLSX com Content-Type correto", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("spreadsheetml.sheet");
	});

	it("200 – Content-Disposition indica attachment com nome do arquivo", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.headers["content-disposition"]).toContain("attachment");
		expect(res.headers["content-disposition"]).toContain("turnos-1.xlsx");
	});

	it("200 – primeira linha contém os headers corretos", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		const ws = await loadSheet(res.body);
		const headers = rowValues(ws, 1);
		expect(headers).toContain("ID");
		expect(headers).toContain("Atleta");
		expect(headers).toContain("Equipe");
		expect(headers).toContain("Distância (km)");
	});

	it("200 – dados aparecem nas linhas seguintes ao header", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		const ws = await loadSheet(res.body);
		expect(ws.rowCount).toBe(2); // header + 1 linha de dado
		const data = rowValues(ws, 2);
		expect(data).toContain("João Silva");
		expect(data).toContain("Time A");
	});

	it("200 – planilha só com header quando não há turnos", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/export/events/999/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		const ws = await loadSheet(res.body);
		expect(ws.rowCount).toBe(1); // apenas header
	});

	it("200 – respeita seleção de colunas via query param", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app)
			.get("/export/events/1/shifts?columns=athlete,team")
			.buffer()
			.parse(binaryParser);
		const ws = await loadSheet(res.body);
		const headers = rowValues(ws, 1);
		expect(headers).toEqual(["Atleta", "Equipe"]);
	});
});

// ─── GET /export/events/:eventId/checkpoints ─────────────────────────────────

describe("GET /export/events/:eventId/checkpoints", () => {
	it("200 – retorna XLSX com Content-Type correto", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("spreadsheetml.sheet");
	});

	it("200 – Content-Disposition indica attachment com nome do arquivo", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints").buffer().parse(binaryParser);
		expect(res.headers["content-disposition"]).toContain("attachment");
		expect(res.headers["content-disposition"]).toContain("checkpoints-1.xlsx");
	});

	it("200 – headers incluem campos esperados", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints").buffer().parse(binaryParser);
		const ws = await loadSheet(res.body);
		const headers = rowValues(ws, 1);
		expect(headers).toContain("ID");
		expect(headers).toContain("Horário");
		expect(headers).toContain("Distância (km)");
		expect(headers).toContain("Tipo");
		expect(headers).toContain("Turno ID");
	});

	it("200 – dados aparecem nas linhas seguintes ao header", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints").buffer().parse(binaryParser);
		const ws = await loadSheet(res.body);
		expect(ws.rowCount).toBe(2);
		expect(rowValues(ws, 2)).toContain("mandatory");
	});

	it("200 – planilha só com header quando não há checkpoints", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/export/events/999/checkpoints").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		const ws = await loadSheet(res.body);
		expect(ws.rowCount).toBe(1);
	});
});

// ─── exportService – formatação de duração (fmtInterval) ─────────────────────

describe("exportService – fmtInterval ramo objeto", () => {
	const durationCell = async (body: Buffer): Promise<string> => {
		const ws = await loadSheet(body);
		const headers = rowValues(ws, 1);
		const idx = headers.findIndex((h) => h.startsWith("Duração"));
		return rowValues(ws, 2)[idx] ?? "";
	};

	it("200 – total_time como objeto {hours,minutes,seconds} é formatado HH:MM:SS", async () => {
		const rowObj = [{ ...mockShiftRows[0], total_time: { hours: 1, minutes: 30, seconds: 45 } }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowObj);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(await durationCell(res.body)).toBe("01:30:45");
	});

	it("200 – total_time como objeto com valores parciais usa 0 como fallback", async () => {
		const rowObj = [{ ...mockShiftRows[0], total_time: { hours: 2 } }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowObj);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(await durationCell(res.body)).toBe("02:00:00");
	});

	it("200 – total_time numérico cai no String(v) bruto", async () => {
		const rowNum = [{ ...mockShiftRows[0], total_time: 5400 }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowNum);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(await durationCell(res.body)).toBe("5400");
	});

	it("200 – total_time null resulta em célula de duração vazia", async () => {
		const rowNull = [{ ...mockShiftRows[0], total_time: null }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowNull);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		expect(await durationCell(res.body)).toBe("");
	});

	it("200 – start_at null resulta em célula de data vazia", async () => {
		const rowNoDate = [{ ...mockShiftRows[0], start_at: null }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowNoDate);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		const ws = await loadSheet(res.body);
		const headers = rowValues(ws, 1);
		const idx = headers.indexOf("Início");
		expect(rowValues(ws, 2)[idx] ?? "").toBe("");
	});

	it("500 – propaga erro do repositório", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockRejectedValue(new Error("db down"));
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(500);
		expect(res.body.error).toBe("db down");
	});
});

// ─── exportService – ramos de formatação (fmtDate/fmtStatus/fmtSpeed/zebra) ───

describe("exportService – ramos de formatação", () => {
	const cellAt = (ws: ExcelJS.Worksheet, header: string, rowNumber: number): string => {
		const headers = rowValues(ws, 1);
		const idx = headers.indexOf(header);
		return rowValues(ws, rowNumber)[idx] ?? "";
	};

	it("200 – cobre data inválida, status nulo/desconhecido, velocidade e zebra", async () => {
		const rows = [
			{
				...mockShiftRows[0],
				status: null,                       // fmtStatus: v ?? ""
				speed: null,                        // fmtSpeed: v == null
				pace: "5:30",                       // transformShift: pace ?? "" (ramo truthy)
				start_at: "data-invalida",          // fmtDate: isNaN(getTime())
				total_time: { minutes: 30, seconds: 5 }, // fmtInterval: hours || 0
			},
			{
				...mockShiftRows[0],
				id: 2,
				status: "status_desconhecido",      // fmtStatus: STATUS_MAP[s] ?? s
				speed: "abc",                       // fmtSpeed: isNaN(n)
				pace: "",
			},
			{
				...mockShiftRows[0],
				id: 3,
				speed: "",                          // fmtSpeed: v === ""
			},
		];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rows);
		const res = await request(app).get("/export/events/1/shifts").buffer().parse(binaryParser);
		expect(res.status).toBe(200);
		const ws = await loadSheet(res.body);
		expect(ws.rowCount).toBe(4); // header + 3 linhas (cobre zebra na linha ímpar)

		// linha 2 (row index 0)
		expect(cellAt(ws, "Início", 2)).toBe("data-invalida");
		expect(cellAt(ws, "Status", 2)).toBe("");
		expect(cellAt(ws, "Velocidade", 2)).toBe("");
		expect(cellAt(ws, "Pace (min/km)", 2)).toBe("5:30");
		expect(cellAt(ws, "Duração (hh:mm:ss)", 2)).toBe("00:30:05");

		// linha 3 (row index 1 → zebra)
		expect(cellAt(ws, "Status", 3)).toBe("status_desconhecido");
		expect(cellAt(ws, "Velocidade", 3)).toBe("abc");

		// linha 4 (row index 2): velocidade vazia e numérica normal coberta antes
		expect(cellAt(ws, "Velocidade", 4)).toBe("");
	});
});
