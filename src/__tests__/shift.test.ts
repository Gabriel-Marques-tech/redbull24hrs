import request from "supertest";
import app from "../app";

jest.mock("../repositories/shiftRepository", () => ({
	shiftRepository: {
		findById: jest.fn(),
		athleteExists: jest.fn(),
		treadmillExists: jest.fn(),
		auditorExists: jest.fn(),
		findOpenByAthlete: jest.fn(),
		findOpenByTreadmill: jest.fn(),
		start: jest.fn(),
		lastCheckpointKm: jest.fn(),
		lastCheckpointTimestamp: jest.fn(),
		addCheckpoint: jest.fn(),
		finish: jest.fn(),
		findCheckpointById: jest.fn(),
		findNeighborCheckpoints: jest.fn(),
		correctCheckpoint: jest.fn(),
	},
}));

jest.mock("../utils/jwt", () => ({
	verifyAccessToken: jest.fn(() => ({ sub: 3, email: "auditor@test.com", role: "auditor", name: "Auditor" })),
}));

import { shiftRepository } from "../repositories/shiftRepository";

const openShift = { id: 10, status: "in_progress", athlete_id: 1, auditor_id: 3, treadmill_id: 2, km_start: 100 };
const completedShift = { ...openShift, status: "completed", km_end: 150, distance: 50 };

const validStart = { athlete_id: 1, auditor_id: 3, treadmill_id: 2, km_start: 100 };

const happyStart = () => {
	(shiftRepository.athleteExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.treadmillExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.auditorExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.findOpenByAthlete as jest.Mock).mockResolvedValue(null);
	(shiftRepository.findOpenByTreadmill as jest.Mock).mockResolvedValue(null);
};

beforeEach(() => jest.clearAllMocks());

// ─── POST /audit/shifts/start ─────────────────────────────────────────────────

describe("POST /audit/shifts/start", () => {
	it("201 – inicia turno com dados válidos", async () => {
		happyStart();
		(shiftRepository.start as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 10, status: "in_progress" });
	});

	it("400 – campos obrigatórios ausentes", async () => {
		const res = await request(app).post("/audit/shifts/start").send({ athlete_id: 1 });
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("400 – km inicial negativo", async () => {
		happyStart();
		const res = await request(app).post("/audit/shifts/start").send({ ...validStart, km_start: -1 });
		expect(res.status).toBe(400);
	});

	it("404 – atleta não encontrado", async () => {
		happyStart();
		(shiftRepository.athleteExists as jest.Mock).mockResolvedValue(false);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(404);
	});

	it("404 – esteira não encontrada", async () => {
		happyStart();
		(shiftRepository.treadmillExists as jest.Mock).mockResolvedValue(false);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(404);
	});

	it("404 – auditor não encontrado", async () => {
		happyStart();
		(shiftRepository.auditorExists as jest.Mock).mockResolvedValue(false);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(404);
	});

	it("409 – atleta já possui turno em aberto", async () => {
		happyStart();
		(shiftRepository.findOpenByAthlete as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(409);
	});

	it("409 – esteira ocupada", async () => {
		happyStart();
		(shiftRepository.findOpenByTreadmill as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(409);
	});
});

// ─── POST /audit/shifts/:id/checkpoints ───────────────────────────────────────

describe("POST /audit/shifts/:id/checkpoints", () => {
	it("201 – registra checkpoint válido", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(120);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(new Date());
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 1, shift_id: 10, distance: 130, type: "mandatory" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130, type: "mandatory" });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ distance: 130 });
	});

	it("201 – usa tipo 'voluntary' por padrão", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(null);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(new Date());
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 1, shift_id: 10, distance: 110, type: "voluntary" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 110 });
		expect(res.status).toBe(201);
		expect(shiftRepository.addCheckpoint).toHaveBeenCalledWith(10, 110, "voluntary");
	});

	it("400 – distance ausente", async () => {
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({});
		expect(res.status).toBe(400);
	});

	it("400 – tipo inválido", async () => {
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130, type: "x" });
		expect(res.status).toBe(400);
	});

	it("404 – turno não encontrado", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).post("/audit/shifts/999/checkpoints").send({ distance: 130 });
		expect(res.status).toBe(404);
	});

	it("409 – turno não está em andamento", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(completedShift);
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130 });
		expect(res.status).toBe(409);
	});

	it("400 – km menor que o último registrado", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(120);
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 110 });
		expect(res.status).toBe(400);
	});
});

// ─── RF045: intervalo entre checkpoints ──────────────────────────────────────

describe("POST /audit/shifts/:id/checkpoints – RF045 intervalo", () => {
	it("400 – rejeita checkpoint com intervalo > 10 min desde o último", async () => {
		const oldTs = new Date(Date.now() - 11 * 60 * 1000); // 11 minutos atrás
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(120);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(oldTs);
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130 });
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/intervalo/i);
	});

	it("400 – rejeita checkpoint com intervalo > 10 min desde o início do turno (sem checkpoints)", async () => {
		const oldStart = { ...openShift, start_at: new Date(Date.now() - 15 * 60 * 1000) };
		(shiftRepository.findById as jest.Mock).mockResolvedValue(oldStart);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(null);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(null);
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 110 });
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/intervalo/i);
	});

	it("201 – aceita checkpoint com intervalo exatamente no limite (< 10 min)", async () => {
		const recentTs = new Date(Date.now() - 9 * 60 * 1000); // 9 minutos atrás
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(120);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(recentTs);
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 5, shift_id: 10, distance: 130, type: "voluntary" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130 });
		expect(res.status).toBe(201);
	});
});

// ─── PATCH /audit/shifts/:id/finish ───────────────────────────────────────────

describe("PATCH /audit/shifts/:id/finish", () => {
	it("200 – finaliza turno e retorna métricas", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(140);
		(shiftRepository.finish as jest.Mock).mockResolvedValue(completedShift);
		const res = await request(app).patch("/audit/shifts/10/finish").send({ km_end: 150 });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ status: "completed", distance: 50 });
	});

	it("400 – km_end ausente", async () => {
		const res = await request(app).patch("/audit/shifts/10/finish").send({});
		expect(res.status).toBe(400);
	});

	it("404 – turno não encontrado", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/audit/shifts/999/finish").send({ km_end: 150 });
		expect(res.status).toBe(404);
	});

	it("409 – turno não está em andamento", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(completedShift);
		const res = await request(app).patch("/audit/shifts/10/finish").send({ km_end: 150 });
		expect(res.status).toBe(409);
	});

	it("400 – km final menor que o km inicial", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).patch("/audit/shifts/10/finish").send({ km_end: 50 });
		expect(res.status).toBe(400);
	});

	it("400 – km final menor que o último checkpoint", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(160);
		const res = await request(app).patch("/audit/shifts/10/finish").send({ km_end: 150 });
		expect(res.status).toBe(400);
	});
});

// ─── PATCH /audit/checkpoints/:id (RF031) ─────────────────────────────────────

const existingCheckpoint = { id: 5, shift_id: 10, distance: 130, type: "voluntary", reviewed: false };
const authHeader = { Authorization: "Bearer valid.token.here" };

describe("PATCH /audit/checkpoints/:id – RF031 correção retroativa", () => {
	it("200 – corrige checkpoint com valor válido entre vizinhos", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(existingCheckpoint);
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.findNeighborCheckpoints as jest.Mock).mockResolvedValue({ prev: 110, next: 150 });
		(shiftRepository.correctCheckpoint as jest.Mock).mockResolvedValue({ ...existingCheckpoint, distance: 125, reviewed: true });

		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({ distance: 125 });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ distance: 125, reviewed: true });
	});

	it("200 – corrige com justificativa quando mantém valor original diferente", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(existingCheckpoint);
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.findNeighborCheckpoints as jest.Mock).mockResolvedValue({ prev: 110, next: 150 });
		(shiftRepository.correctCheckpoint as jest.Mock).mockResolvedValue({ ...existingCheckpoint, reviewed: true, justification: "erro de digitação" });

		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({ distance: 130, justification: "erro de digitação" });

		expect(res.status).toBe(200);
		expect(res.body.justification).toBe("erro de digitação");
	});

	it("400 – distance ausente no body", async () => {
		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({});
		expect(res.status).toBe(400);
	});

	it("401 – sem token de autenticação", async () => {
		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.send({ distance: 125 });
		expect(res.status).toBe(401);
	});

	it("404 – checkpoint não encontrado", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(null);
		const res = await request(app)
			.patch("/audit/checkpoints/999")
			.set(authHeader)
			.send({ distance: 125 });
		expect(res.status).toBe(404);
	});

	it("422 – novo valor menor que checkpoint anterior", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(existingCheckpoint);
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.findNeighborCheckpoints as jest.Mock).mockResolvedValue({ prev: 120, next: 150 });

		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({ distance: 115 });

		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/anterior/i);
	});

	it("422 – novo valor maior que checkpoint posterior", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(existingCheckpoint);
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.findNeighborCheckpoints as jest.Mock).mockResolvedValue({ prev: 110, next: 140 });

		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({ distance: 145 });

		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/posterior/i);
	});

	it("422 – valor negativo", async () => {
		(shiftRepository.findCheckpointById as jest.Mock).mockResolvedValue(existingCheckpoint);
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.findNeighborCheckpoints as jest.Mock).mockResolvedValue({ prev: null, next: null });

		const res = await request(app)
			.patch("/audit/checkpoints/5")
			.set(authHeader)
			.send({ distance: -5 });

		expect(res.status).toBe(422);
	});
});
