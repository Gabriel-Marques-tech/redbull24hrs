import request from "supertest";
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

beforeEach(() => jest.clearAllMocks());

// ─── GET /export/events/:eventId/shifts ───────────────────────────────────────

describe("GET /export/events/:eventId/shifts", () => {
	it("200 – retorna CSV com Content-Type correto", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toMatch(/text\/csv/);
	});

	it("200 – Content-Disposition indica attachment com nome do arquivo", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.headers["content-disposition"]).toContain("attachment");
		expect(res.headers["content-disposition"]).toContain("shifts-1.csv");
	});

	it("200 – primeira linha do CSV contém os headers corretos", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts");
		const lines = res.text.split("\n");
		const headers = lines[0].split(",");
		expect(headers).toContain("ID");
		expect(headers).toContain("Atleta");
		expect(headers).toContain("Equipe");
		expect(headers).toContain("Distância (km)");
	});

	it("200 – dados aparecem nas linhas seguintes ao header", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(mockShiftRows);
		const res = await request(app).get("/export/events/1/shifts");
		const lines = res.text.split("\n");
		expect(lines.length).toBe(2); // header + 1 linha de dado
		expect(lines[1]).toContain("João Silva");
		expect(lines[1]).toContain("Time A");
	});

	it("200 – CSV vazio quando não há turnos", async () => {
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/export/events/999/shifts");
		expect(res.status).toBe(200);
		expect(res.text).toBe("");
	});

	it("200 – valores com vírgula são encapsulados em aspas", async () => {
		const rowWithComma = [{ ...mockShiftRows[0], athlete_name: "Silva, João" }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowWithComma);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.text).toContain('"Silva, João"');
	});
});

// ─── GET /export/events/:eventId/checkpoints ─────────────────────────────────

describe("GET /export/events/:eventId/checkpoints", () => {
	it("200 – retorna CSV com Content-Type correto", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints");
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toMatch(/text\/csv/);
	});

	it("200 – Content-Disposition indica attachment com nome do arquivo", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints");
		expect(res.headers["content-disposition"]).toContain("attachment");
		expect(res.headers["content-disposition"]).toContain("checkpoints-1.csv");
	});

	it("200 – headers do CSV de checkpoints incluem campos esperados", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints");
		const headers = res.text.split("\n")[0].split(",");
		expect(headers).toContain("ID");
		expect(headers).toContain("Horário");
		expect(headers).toContain("Distância (km)");
		expect(headers).toContain("Tipo");
		expect(headers).toContain("Turno ID");
	});

	it("200 – dados aparecem nas linhas seguintes ao header", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue(mockCheckpointRows);
		const res = await request(app).get("/export/events/1/checkpoints");
		const lines = res.text.split("\n");
		expect(lines.length).toBe(2);
		expect(lines[1]).toContain("mandatory");
	});

	it("200 – CSV vazio quando não há checkpoints", async () => {
		(exportRepository.checkpointsByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/export/events/999/checkpoints");
		expect(res.status).toBe(200);
		expect(res.text).toBe("");
	});
});

// ─── fmtInterval – ramo objeto (cobertura de linhas 33-40) ───────────────────

describe("exportService – fmtInterval ramo objeto", () => {
	it("200 – total_time como objeto {hours,minutes,seconds} é formatado HH:MM:SS", async () => {
		const rowObj = [{ ...mockShiftRows[0], total_time: { hours: 1, minutes: 30, seconds: 45 } }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowObj);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(200);
		expect(res.text).toContain("01:30:45");
	});

	it("200 – total_time como objeto com valores parciais usa 0 como fallback", async () => {
		const rowObj = [{ ...mockShiftRows[0], total_time: { hours: 2 } }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowObj);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(200);
		expect(res.text).toContain("02:00:00");
	});

	it("200 – total_time null resulta em célula vazia no CSV", async () => {
		const rowNull = [{ ...mockShiftRows[0], total_time: null }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowNull);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(200);
		const lines = res.text.split("\n");
		expect(lines).toHaveLength(2);
	});

	it("200 – start_at null resulta em célula de data vazia", async () => {
		const rowNoDate = [{ ...mockShiftRows[0], start_at: null }];
		(exportRepository.shiftsByEvent as jest.Mock).mockResolvedValue(rowNoDate);
		const res = await request(app).get("/export/events/1/shifts");
		expect(res.status).toBe(200);
		const lines = res.text.split("\n");
		expect(lines).toHaveLength(2);
	});
});
