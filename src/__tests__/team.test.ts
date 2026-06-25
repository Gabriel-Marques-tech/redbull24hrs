import request from "supertest";
import app from "../app";

jest.mock("../repositories/eventRepository", () => ({
	eventRepository: {
		findById: jest.fn(),
	},
}));

jest.mock("../repositories/teamRepository", () => ({
	teamRepository: {
		create: jest.fn(),
		findAll: jest.fn(),
		findById: jest.fn(),
		update: jest.fn(),
		softDelete: jest.fn(),
	},
}));

jest.mock("../repositories/athleteRepository", () => ({
	athleteRepository: {
		create: jest.fn(),
		findByTeamId: jest.fn(),
		findById: jest.fn(),
		update: jest.fn(),
		softDelete: jest.fn(),
	},
}));

jest.mock("../repositories/treadmillRepository", () => ({
	treadmillRepository: {
		create: jest.fn(),
	},
}));

import { eventRepository } from "../repositories/eventRepository";
import { teamRepository } from "../repositories/teamRepository";
import { athleteRepository } from "../repositories/athleteRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";

const mockEvent = { id: 1, title: "Maratona SP", local: "São Paulo", date: "2026-06-01", deleted_at: null };
const mockTeam = { id: 1, name: "Alpha", event_id: 1, deleted_at: null };
const mockAthlete = { id: 1, name: "João Silva", gender: "masculino", cpf: null, team_id: 1, deleted_at: null };

beforeEach(() => jest.clearAllMocks());

// ─── GET /teams ───────────────────────────────────────────────────────────────

describe("GET /teams", () => {
	it("200 – retorna lista de times", async () => {
		(teamRepository.findAll as jest.Mock).mockResolvedValue([mockTeam]);
		const res = await request(app).get("/teams");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockTeam]);
	});

	it("200 – retorna lista vazia", async () => {
		(teamRepository.findAll as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/teams");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /teams ──────────────────────────────────────────────────────────────

describe("POST /teams", () => {
	it("201 – cria time em evento existente", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
		(teamRepository.findAll as jest.Mock).mockResolvedValue([]);
		(teamRepository.create as jest.Mock).mockResolvedValue(mockTeam);
		(treadmillRepository.create as jest.Mock).mockResolvedValue({ id: 1 });
		const res = await request(app).post("/teams").send({ event_id: 1, name: "Alpha" });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, name: "Alpha" });
	});

	it("400 – campos obrigatórios ausentes", async () => {
		const res = await request(app).post("/teams").send({ name: "Alpha" });
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("404 – evento não encontrado", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).post("/teams").send({ event_id: 999, name: "Alpha" });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /teams/:id ───────────────────────────────────────────────────────────

describe("GET /teams/:id", () => {
	it("200 – retorna time existente", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		const res = await request(app).get("/teams/1");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 1 });
	});

	it("404 – time não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).get("/teams/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── PATCH /teams/:id ─────────────────────────────────────────────────────────

describe("PATCH /teams/:id", () => {
	it("200 – atualiza time existente", async () => {
		(teamRepository.update as jest.Mock).mockResolvedValue({ ...mockTeam, name: "Beta" });
		const res = await request(app).patch("/teams/1").send({ name: "Beta" });
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Beta");
	});

	it("400 – name ausente", async () => {
		const res = await request(app).patch("/teams/1").send({});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("404 – time não encontrado", async () => {
		(teamRepository.update as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/teams/999").send({ name: "Beta" });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── DELETE /teams/:id ────────────────────────────────────────────────────────

describe("DELETE /teams/:id", () => {
	it("200 – soft delete de time existente", async () => {
		(teamRepository.softDelete as jest.Mock).mockResolvedValue({ ...mockTeam, deleted_at: "2026-05-25T00:00:00Z" });
		const res = await request(app).delete("/teams/1");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("deleted_at");
	});

	it("404 – time não encontrado", async () => {
		(teamRepository.softDelete as jest.Mock).mockResolvedValue(null);
		const res = await request(app).delete("/teams/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /teams/:teamId/athletes ──────────────────────────────────────────────

describe("GET /teams/:teamId/athletes", () => {
	it("200 – retorna atletas do time", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.findByTeamId as jest.Mock).mockResolvedValue([mockAthlete]);
		const res = await request(app).get("/teams/1/athletes");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockAthlete]);
	});

	it("404 – time não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).get("/teams/999/athletes");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── POST /teams/:teamId/athletes ─────────────────────────────────────────────

describe("POST /teams/:teamId/athletes", () => {
	it("201 – registra atleta em time existente", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.create as jest.Mock).mockResolvedValue(mockAthlete);
		const res = await request(app).post("/teams/1/athletes").send({ name: "João Silva", gender: "masculino" });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, name: "João Silva" });
	});

	it("400 – campos obrigatórios ausentes", async () => {
		const res = await request(app).post("/teams/1/athletes").send({ name: "João Silva" });
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("404 – time não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).post("/teams/999/athletes").send({ name: "João Silva", gender: "masculino" });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /teams/:teamId/athletes/:id ──────────────────────────────────────────

describe("GET /teams/:teamId/athletes/:id", () => {
	it("200 – retorna atleta existente", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.findById as jest.Mock).mockResolvedValue(mockAthlete);
		const res = await request(app).get("/teams/1/athletes/1");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 1 });
	});

	it("404 – atleta não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).get("/teams/1/athletes/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── PATCH /teams/:teamId/athletes/:id ────────────────────────────────────────

describe("PATCH /teams/:teamId/athletes/:id", () => {
	it("200 – atualiza atleta existente", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.update as jest.Mock).mockResolvedValue({ ...mockAthlete, name: "Maria Silva" });
		const res = await request(app).patch("/teams/1/athletes/1").send({ name: "Maria Silva" });
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Maria Silva");
	});

	it("404 – atleta não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.update as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/teams/1/athletes/999").send({ name: "X" });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── DELETE /teams/:teamId/athletes/:id ───────────────────────────────────────

describe("DELETE /teams/:teamId/athletes/:id", () => {
	it("200 – soft delete de atleta existente", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.softDelete as jest.Mock).mockResolvedValue({ ...mockAthlete, deleted_at: "2026-05-25T00:00:00Z" });
		const res = await request(app).delete("/teams/1/athletes/1");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("deleted_at");
	});

	it("404 – atleta não encontrado", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.softDelete as jest.Mock).mockResolvedValue(null);
		const res = await request(app).delete("/teams/1/athletes/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});
