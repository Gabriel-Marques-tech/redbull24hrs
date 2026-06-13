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

jest.mock("../repositories/metricsRepository", () => ({
	metricsRepository: {
		teamKmByEvent: jest.fn(),
		dashboardByEvent: jest.fn(),
		athleteKmByEvent: jest.fn(),
		avgDistancePerShift: jest.fn(),
		kmSnapshots: jest.fn(),
		athletePerformance: jest.fn(),
	},
}));

import { metricsRepository } from "../repositories/metricsRepository";

const mockTeams = [
	{ id: 1, name: "Time A", total_km: 120 },
	{ id: 2, name: "Time B", total_km: 95 },
];

const mockDashboard = {
	scoreboard: mockTeams,
	active_shifts: 2,
	completed_shifts: 10,
	total_km: 215,
	athletes_on_track: [{ athlete_id: 1, athlete_name: "João", treadmill_number: 3 }],
};

const mockAthletes = [
	{ id: 1, name: "João", team_name: "Time A", total_km: 60, shift_count: 3 },
	{ id: 2, name: "Maria", team_name: "Time A", total_km: 40, shift_count: 2 },
];

const mockAvg = { avg_distance_per_shift: "20.00", total_shifts: "3", total_distance: "60" };

const mockBuckets = [
	{ hour_bucket: 0, km_in_bucket: 10 },
	{ hour_bucket: 2, km_in_bucket: 5 },
];

const mockPerformanceShifts = [
	{
		id: 1,
		start_at: "2026-06-01T08:00:00Z",
		end_at: "2026-06-01T08:30:00Z",
		distance: 10,
		speed: 20,
		total_time: { hours: 0, minutes: 30, seconds: 0 },
		treadmill_number: 5,
		checkpoints: [],
	},
	{
		id: 2,
		start_at: "2026-06-01T09:00:00Z",
		end_at: "2026-06-01T09:45:00Z",
		distance: 15,
		speed: 20,
		total_time: { hours: 0, minutes: 45, seconds: 0 },
		treadmill_number: 3,
		checkpoints: [],
	},
];

beforeEach(() => jest.clearAllMocks());

// ─── GET /metrics/events/:eventId/dashboard ───────────────────────────────────

describe("GET /metrics/events/:eventId/dashboard", () => {
	it("200 – retorna placar e métricas do evento", async () => {
		(metricsRepository.dashboardByEvent as jest.Mock).mockResolvedValue(mockDashboard);
		const res = await request(app).get("/metrics/events/1/dashboard");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("scoreboard");
		expect(res.body).toHaveProperty("active_shifts");
		expect(res.body).toHaveProperty("total_km");
		expect(res.body).toHaveProperty("athletes_on_track");
		expect(res.body.scoreboard).toHaveLength(2);
	});

	it("200 – scoreboard está ordenado por total_km desc", async () => {
		(metricsRepository.dashboardByEvent as jest.Mock).mockResolvedValue(mockDashboard);
		const res = await request(app).get("/metrics/events/1/dashboard");
		expect(res.body.scoreboard[0].total_km).toBeGreaterThanOrEqual(res.body.scoreboard[1].total_km);
	});
});

// ─── GET /metrics/events/:eventId/teams ──────────────────────────────────────

describe("GET /metrics/events/:eventId/teams", () => {
	it("200 – retorna km total por equipe", async () => {
		(metricsRepository.teamKmByEvent as jest.Mock).mockResolvedValue(mockTeams);
		const res = await request(app).get("/metrics/events/1/teams");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0]).toHaveProperty("total_km");
	});

	it("200 – retorna array vazio quando não há equipes", async () => {
		(metricsRepository.teamKmByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/metrics/events/999/teams");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── GET /metrics/events/:eventId/athletes ───────────────────────────────────

describe("GET /metrics/events/:eventId/athletes", () => {
	it("200 – retorna km total por atleta no evento", async () => {
		(metricsRepository.athleteKmByEvent as jest.Mock).mockResolvedValue(mockAthletes);
		const res = await request(app).get("/metrics/events/1/athletes");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0]).toHaveProperty("total_km");
		expect(res.body[0]).toHaveProperty("shift_count");
	});

	it("200 – retorna array vazio quando não há atletas", async () => {
		(metricsRepository.athleteKmByEvent as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/metrics/events/999/athletes");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── GET /metrics/athletes/:athleteId/shifts ─────────────────────────────────

describe("GET /metrics/athletes/:athleteId/shifts", () => {
	it("200 – retorna média de distância por turno", async () => {
		(metricsRepository.avgDistancePerShift as jest.Mock).mockResolvedValue(mockAvg);
		const res = await request(app).get("/metrics/athletes/1/shifts");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("avg_distance_per_shift");
		expect(res.body).toHaveProperty("total_shifts");
		expect(res.body).toHaveProperty("total_distance");
	});

	it("200 – retorna zero para atleta sem turnos finalizados", async () => {
		(metricsRepository.avgDistancePerShift as jest.Mock).mockResolvedValue({
			avg_distance_per_shift: null,
			total_shifts: "0",
			total_distance: "0",
		});
		const res = await request(app).get("/metrics/athletes/999/shifts");
		expect(res.status).toBe(200);
	});
});

// ─── GET /metrics/athletes/:athleteId/snapshots ──────────────────────────────

describe("GET /metrics/athletes/:athleteId/snapshots", () => {
	it("200 – retorna snapshots cumulativos por hora", async () => {
		(metricsRepository.kmSnapshots as jest.Mock).mockResolvedValue(mockBuckets);
		const res = await request(app).get("/metrics/athletes/1/snapshots?event_id=1");
		expect(res.status).toBe(200);
		// hour 0 → 10, hour 1 → 10 (sem km), hour 2 → 15
		expect(res.body).toHaveLength(3);
		expect(res.body[0]).toEqual({ hour: 0, cumulative_km: 10 });
		expect(res.body[1]).toEqual({ hour: 1, cumulative_km: 10 });
		expect(res.body[2]).toEqual({ hour: 2, cumulative_km: 15 });
	});

	it("200 – retorna array vazio quando não há turnos", async () => {
		(metricsRepository.kmSnapshots as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/metrics/athletes/1/snapshots?event_id=1");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("400 – rejeita requisição sem event_id", async () => {
		const res = await request(app).get("/metrics/athletes/1/snapshots");
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /metrics/athletes/:athleteId/performance ────────────────────────────

describe("GET /metrics/athletes/:athleteId/performance", () => {
	it("200 – retorna summary calculado corretamente", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue(mockPerformanceShifts);
		const res = await request(app).get("/metrics/athletes/1/performance");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("summary");
		expect(res.body).toHaveProperty("shifts");
		const { summary } = res.body;
		// distance: 10 + 15 = 25; time: 1800 + 2700 = 4500s; avg_speed = 25/(4500/3600) = 20
		expect(summary.total_distance).toBe(25);
		expect(summary.total_time_seconds).toBe(4500);
		expect(summary.avg_speed).toBe(20);
		expect(summary.shift_count).toBe(2);
	});

	it("200 – summary zerado quando não há turnos", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/metrics/athletes/999/performance");
		expect(res.status).toBe(200);
		expect(res.body.summary.shift_count).toBe(0);
		expect(res.body.summary.total_distance).toBe(0);
		expect(res.body.shifts).toEqual([]);
	});

	it("200 – aceita filtro event_id via query param", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue(mockPerformanceShifts);
		await request(app).get("/metrics/athletes/1/performance?event_id=5");
		expect(metricsRepository.athletePerformance).toHaveBeenCalledWith(1, 5);
	});

	it("200 – event_id opcional (undefined quando ausente)", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue([]);
		await request(app).get("/metrics/athletes/1/performance");
		expect(metricsRepository.athletePerformance).toHaveBeenCalledWith(1, undefined);
	});
});

// ─── GET /metrics/athletes/:athleteId/share (RF050) ──────────────────────────

describe("GET /metrics/athletes/:athleteId/share – RF050 link público", () => {
	it("200 – acessível sem token de autenticação", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue(mockPerformanceShifts);
		const res = await request(app).get("/metrics/athletes/1/share");
		expect(res.status).toBe(200);
	});

	it("200 – retorna summary e shifts do atleta", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue(mockPerformanceShifts);
		const res = await request(app).get("/metrics/athletes/1/share");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("summary");
		expect(res.body).toHaveProperty("shifts");
		expect(res.body.summary.shift_count).toBe(2);
		expect(res.body.summary.total_distance).toBe(25);
	});

	it("200 – atleta sem turnos retorna summary zerado", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/metrics/athletes/999/share");
		expect(res.status).toBe(200);
		expect(res.body.summary.shift_count).toBe(0);
		expect(res.body.shifts).toEqual([]);
	});

	it("200 – chama athletePerformance sem eventId (all-time)", async () => {
		(metricsRepository.athletePerformance as jest.Mock).mockResolvedValue(mockPerformanceShifts);
		await request(app).get("/metrics/athletes/3/share");
		expect(metricsRepository.athletePerformance).toHaveBeenCalledWith(3, undefined);
	});

	it("400 – athleteId não numérico", async () => {
		const res = await request(app).get("/metrics/athletes/abc/share");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/inválido/i);
	});
});
