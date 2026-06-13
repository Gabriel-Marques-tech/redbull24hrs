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

jest.mock("../repositories/historyRepository", () => ({
	historyRepository: {
		findByEvent: jest.fn(),
	},
}));

import { historyRepository } from "../repositories/historyRepository";

const entry = (type: string, ts: string) => ({
	entry_type: type,
	timestamp: ts,
	shift_id: 10,
	athlete_id: 1,
	athlete_name: "João",
	team_id: 2,
	team_name: "Time A",
	treadmill_id: 3,
	treadmill_number: 5,
	distance: null,
	checkpoint_type: null,
});

const mockEntries = [
	{ ...entry("shift_start", "2026-06-01T09:00:00Z") },
	{ ...entry("checkpoint", "2026-06-01T09:05:00Z"), distance: 2, checkpoint_type: "mandatory" },
	{ ...entry("shift_end", "2026-06-01T09:30:00Z"), distance: 10 },
];

beforeEach(() => jest.clearAllMocks());

// ─── GET /audit/history ───────────────────────────────────────────────────────

describe("GET /audit/history", () => {
	it("200 – retorna entradas de histórico para o evento", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue(mockEntries);
		const res = await request(app).get("/audit/history?event_id=1");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(3);
		expect(res.body[0]).toHaveProperty("entry_type");
		expect(res.body[0]).toHaveProperty("timestamp");
	});

	it("200 – retorna array vazio quando não há entradas", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/audit/history?event_id=999");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("400 – rejeita requisição sem event_id", async () => {
		const res = await request(app).get("/audit/history");
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("200 – passa filtro team_id ao repositório", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue(mockEntries);
		await request(app).get("/audit/history?event_id=1&team_id=2");
		expect(historyRepository.findByEvent).toHaveBeenCalledWith(
			expect.objectContaining({ event_id: 1, team_id: 2 })
		);
	});

	it("200 – passa filtro treadmill_id ao repositório", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue(mockEntries);
		await request(app).get("/audit/history?event_id=1&treadmill_id=3");
		expect(historyRepository.findByEvent).toHaveBeenCalledWith(
			expect.objectContaining({ event_id: 1, treadmill_id: 3 })
		);
	});

	it("200 – passa filtro athlete_id ao repositório", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue(mockEntries);
		await request(app).get("/audit/history?event_id=1&athlete_id=5");
		expect(historyRepository.findByEvent).toHaveBeenCalledWith(
			expect.objectContaining({ event_id: 1, athlete_id: 5 })
		);
	});

	it("200 – filtros ausentes são omitidos (undefined) na chamada ao repositório", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue([]);
		await request(app).get("/audit/history?event_id=1");
		expect(historyRepository.findByEvent).toHaveBeenCalledWith({
			event_id: 1,
			team_id: undefined,
			treadmill_id: undefined,
			athlete_id: undefined,
		});
	});

	it("200 – entradas contêm os campos esperados", async () => {
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue([mockEntries[1]]);
		const res = await request(app).get("/audit/history?event_id=1");
		expect(res.status).toBe(200);
		const [cp] = res.body;
		expect(cp.entry_type).toBe("checkpoint");
		expect(cp.athlete_name).toBe("João");
		expect(cp.team_name).toBe("Time A");
		expect(cp.treadmill_number).toBe(5);
		expect(cp.distance).toBe(2);
		expect(cp.checkpoint_type).toBe("mandatory");
	});
});
