import request from "supertest";
import app from "../app";

jest.mock("../middlewares/authMiddleware", () => ({
	__esModule: true,
	default: {
		requireAuth: (_req: any, _res: any, next: any) => next(),
		requireRole: () => (_req: any, _res: any, next: any) => next(),
	},
}));

jest.mock("../repositories/alertsRepository", () => ({
	alertsRepository: {
		treadmillsOverThreshold: jest.fn(),
		treadmillsWithoutRecentCheckpoint: jest.fn(),
	},
}));

import { alertsRepository } from "../repositories/alertsRepository";

const mockRotationAlert = {
	treadmill_id: 3,
	treadmill_number: 5,
	shift_id: 10,
	athlete_name: "João",
	start_at: "2026-06-01T08:00:00Z",
	minutes_occupied: 35,
};

const mockGapAlert = {
	shift_id: 11,
	treadmill_number: 6,
	athlete_name: "Maria",
	last_checkpoint: "2026-06-01T09:00:00Z",
	minutes_since: 7,
};

beforeEach(() => jest.clearAllMocks());

// ─── GET /audit/alerts ────────────────────────────────────────────────────────

describe("GET /audit/alerts", () => {
	it("200 – retorna alertas de rotação e gap de checkpoint", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([mockRotationAlert]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([mockGapAlert]);
		const res = await request(app).get("/audit/alerts?event_id=1");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("treadmill_rotation");
		expect(res.body).toHaveProperty("checkpoint_gap");
	});

	it("200 – alertas de rotação contêm campos esperados", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([mockRotationAlert]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/audit/alerts?event_id=1");
		const alert = res.body.treadmill_rotation[0];
		expect(alert).toHaveProperty("treadmill_number");
		expect(alert).toHaveProperty("athlete_name");
		expect(alert).toHaveProperty("minutes_occupied");
		expect(alert.minutes_occupied).toBeGreaterThan(30);
	});

	it("200 – alertas de checkpoint contêm campos esperados", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([mockGapAlert]);
		const res = await request(app).get("/audit/alerts?event_id=1");
		const alert = res.body.checkpoint_gap[0];
		expect(alert).toHaveProperty("treadmill_number");
		expect(alert).toHaveProperty("athlete_name");
		expect(alert).toHaveProperty("minutes_since");
		expect(alert.minutes_since).toBeGreaterThan(5);
	});

	it("200 – ambos arrays vazios quando não há alertas ativos", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/audit/alerts?event_id=1");
		expect(res.status).toBe(200);
		expect(res.body.treadmill_rotation).toEqual([]);
		expect(res.body.checkpoint_gap).toEqual([]);
	});

	it("200 – múltiplos alertas em cada categoria", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([
			mockRotationAlert,
			{ ...mockRotationAlert, treadmill_id: 4, treadmill_number: 6, minutes_occupied: 45 },
		]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([mockGapAlert]);
		const res = await request(app).get("/audit/alerts?event_id=1");
		expect(res.body.treadmill_rotation).toHaveLength(2);
		expect(res.body.checkpoint_gap).toHaveLength(1);
	});

	it("400 – rejeita requisição sem event_id", async () => {
		const res = await request(app).get("/audit/alerts");
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("200 – repassa event_id correto ao repositório", async () => {
		(alertsRepository.treadmillsOverThreshold as jest.Mock).mockResolvedValue([]);
		(alertsRepository.treadmillsWithoutRecentCheckpoint as jest.Mock).mockResolvedValue([]);
		await request(app).get("/audit/alerts?event_id=42");
		expect(alertsRepository.treadmillsOverThreshold).toHaveBeenCalledWith(42);
		expect(alertsRepository.treadmillsWithoutRecentCheckpoint).toHaveBeenCalledWith(42);
	});
});
