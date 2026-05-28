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
		addCheckpoint: jest.fn(),
		finish: jest.fn(),
	},
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
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 1, shift_id: 10, distance: 130, type: "mandatory" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130, type: "mandatory" });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ distance: 130 });
	});

	it("201 – usa tipo 'voluntary' por padrão", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(null);
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
