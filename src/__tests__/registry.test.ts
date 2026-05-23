import request from "supertest";
import app from "../app";

jest.mock("../repositories/entityRepositories", () => ({
	eventRepository: {
		createWithManager: jest.fn(),
		findById: jest.fn(),
		findAll: jest.fn(),
	},
	teamRepository: {
		create: jest.fn(),
		findById: jest.fn(),
		findByEventId: jest.fn(),
	},
	athleteRepository: {
		create: jest.fn(),
		findByTeamId: jest.fn(),
	},
	treadmillRepository: {
		create: jest.fn(),
		findAll: jest.fn(),
	},
}));

import {
	eventRepository,
	teamRepository,
	athleteRepository,
	treadmillRepository,
} from "../repositories/entityRepositories";

const mockEvent = { id: 1, title: "Maratona SP", local: "São Paulo", date: "2026-06-01" };
const mockTeam = { id: 1, name: "Alpha", event_id: 1 };
const mockAthlete = { id: 1, name: "João Silva", gender: "masculino", cpf: null, team_id: 1 };
const mockTreadmill = { id: 1, number: 5 };

beforeEach(() => jest.clearAllMocks());

// ─── GET /registry/events ────────────────────────────────────────────────────

describe("GET /registry/events", () => {
	it("200 – retorna lista de eventos", async () => {
		(eventRepository.findAll as jest.Mock).mockResolvedValue([mockEvent]);

		const res = await request(app).get("/registry/events");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockEvent]);
	});

	it("200 – retorna lista vazia quando não há eventos", async () => {
		(eventRepository.findAll as jest.Mock).mockResolvedValue([]);

		const res = await request(app).get("/registry/events");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /registry/events ───────────────────────────────────────────────────

describe("POST /registry/events", () => {
	it("201 – cria evento com dados válidos", async () => {
		(eventRepository.createWithManager as jest.Mock).mockResolvedValue(mockEvent);

		const res = await request(app).post("/registry/events").send({
			manager_id: 1,
			title: "Maratona SP",
			local: "São Paulo",
			date: "2026-06-01",
		});

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, title: "Maratona SP" });
	});

	it("400 – retorna erro quando campos obrigatórios estão ausentes", async () => {
		const res = await request(app).post("/registry/events").send({ title: "Maratona SP" });

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /registry/events/:eventId/teams ─────────────────────────────────────

describe("GET /registry/events/:eventId/teams", () => {
	it("200 – retorna equipes do evento", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
		(teamRepository.findByEventId as jest.Mock).mockResolvedValue([mockTeam]);

		const res = await request(app).get("/registry/events/1/teams");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockTeam]);
	});

	it("404 – retorna erro quando evento não existe", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(null);

		const res = await request(app).get("/registry/events/999/teams");

		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── POST /registry/events/:eventId/teams ────────────────────────────────────

describe("POST /registry/events/:eventId/teams", () => {
	it("201 – cria equipe em evento existente", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
		(teamRepository.create as jest.Mock).mockResolvedValue(mockTeam);

		const res = await request(app).post("/registry/events/1/teams").send({ name: "Alpha" });

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, name: "Alpha", event_id: 1 });
	});

	it("400 – retorna erro quando name está ausente", async () => {
		const res = await request(app).post("/registry/events/1/teams").send({});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("404 – retorna erro quando evento não existe", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(null);

		const res = await request(app).post("/registry/events/999/teams").send({ name: "Alpha" });

		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /registry/teams/:teamId/athletes ────────────────────────────────────

describe("GET /registry/teams/:teamId/athletes", () => {
	it("200 – retorna corredores da equipe", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.findByTeamId as jest.Mock).mockResolvedValue([mockAthlete]);

		const res = await request(app).get("/registry/teams/1/athletes");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockAthlete]);
	});

	it("404 – retorna erro quando equipe não existe", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(null);

		const res = await request(app).get("/registry/teams/999/athletes");

		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── POST /registry/teams/:teamId/athletes ───────────────────────────────────

describe("POST /registry/teams/:teamId/athletes", () => {
	it("201 – registra corredor com dados válidos", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(mockTeam);
		(athleteRepository.create as jest.Mock).mockResolvedValue(mockAthlete);

		const res = await request(app).post("/registry/teams/1/athletes").send({
			name: "João Silva",
			gender: "masculino",
		});

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, name: "João Silva" });
	});

	it("400 – retorna erro quando name ou gender estão ausentes", async () => {
		const res = await request(app).post("/registry/teams/1/athletes").send({ name: "João Silva" });

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});

	it("404 – retorna erro quando equipe não existe", async () => {
		(teamRepository.findById as jest.Mock).mockResolvedValue(null);

		const res = await request(app).post("/registry/teams/999/athletes").send({
			name: "João Silva",
			gender: "masculino",
		});

		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /registry/treadmills ────────────────────────────────────────────────

describe("GET /registry/treadmills", () => {
	it("200 – retorna lista de esteiras", async () => {
		(treadmillRepository.findAll as jest.Mock).mockResolvedValue([mockTreadmill]);

		const res = await request(app).get("/registry/treadmills");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockTreadmill]);
	});

	it("200 – retorna lista vazia quando não há esteiras", async () => {
		(treadmillRepository.findAll as jest.Mock).mockResolvedValue([]);

		const res = await request(app).get("/registry/treadmills");

		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /registry/treadmills ───────────────────────────────────────────────

describe("POST /registry/treadmills", () => {
	it("201 – registra esteira com número válido", async () => {
		(treadmillRepository.create as jest.Mock).mockResolvedValue(mockTreadmill);

		const res = await request(app).post("/registry/treadmills").send({ number: 5 });

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, number: 5 });
	});

	it("400 – retorna erro quando number está ausente", async () => {
		const res = await request(app).post("/registry/treadmills").send({});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});
});
