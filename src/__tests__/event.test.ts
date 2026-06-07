import request from "supertest";
import app from "../app";

jest.mock("../repositories/eventRepository", () => ({
	eventRepository: {
		createWithManager: jest.fn(),
		findAll: jest.fn(),
		findById: jest.fn(),
		update: jest.fn(),
		softDelete: jest.fn(),
	},
}));

jest.mock("../repositories/treadmillRepository", () => ({
	treadmillRepository: {
		create: jest.fn(),
		findAll: jest.fn(),
		findById: jest.fn(),
		update: jest.fn(),
		hardDelete: jest.fn(),
	},
}));

import { eventRepository } from "../repositories/eventRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";

const mockEvent = { id: 1, title: "Maratona SP", local: "São Paulo", date: "2026-06-01", deleted_at: null };
const mockTreadmill = { id: 1, number: 5 };

beforeEach(() => jest.clearAllMocks());

// ─── GET /events ──────────────────────────────────────────────────────────────

describe("GET /events", () => {
	it("200 – retorna lista de eventos", async () => {
		(eventRepository.findAll as jest.Mock).mockResolvedValue([mockEvent]);
		const res = await request(app).get("/events");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockEvent]);
	});

	it("200 – retorna lista vazia", async () => {
		(eventRepository.findAll as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/events");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /events ─────────────────────────────────────────────────────────────

describe("POST /events", () => {
	it("201 – cria evento com dados válidos", async () => {
		(eventRepository.createWithManager as jest.Mock).mockResolvedValue(mockEvent);
		const res = await request(app).post("/events").send({ manager_id: 1, title: "Maratona SP", local: "São Paulo", date: "2026-06-01" });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, title: "Maratona SP" });
	});

	it("400 – campos obrigatórios ausentes", async () => {
		const res = await request(app).post("/events").send({ title: "Maratona SP" });
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /events/:id ──────────────────────────────────────────────────────────

describe("GET /events/:id", () => {
	it("200 – retorna evento existente", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
		const res = await request(app).get("/events/1");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 1 });
	});

	it("404 – evento não encontrado", async () => {
		(eventRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).get("/events/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── PATCH /events/:id ────────────────────────────────────────────────────────

describe("PATCH /events/:id", () => {
	it("200 – atualiza evento existente", async () => {
		(eventRepository.update as jest.Mock).mockResolvedValue({ ...mockEvent, title: "Maratona RJ" });
		const res = await request(app).patch("/events/1").send({ title: "Maratona RJ" });
		expect(res.status).toBe(200);
		expect(res.body.title).toBe("Maratona RJ");
	});

	it("404 – evento não encontrado", async () => {
		(eventRepository.update as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/events/999").send({ title: "X" });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── DELETE /events/:id ───────────────────────────────────────────────────────

describe("DELETE /events/:id", () => {
	it("200 – soft delete de evento existente", async () => {
		(eventRepository.softDelete as jest.Mock).mockResolvedValue({ ...mockEvent, deleted_at: "2026-05-25T00:00:00Z" });
		const res = await request(app).delete("/events/1");
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("deleted_at");
	});

	it("404 – evento não encontrado", async () => {
		(eventRepository.softDelete as jest.Mock).mockResolvedValue(null);
		const res = await request(app).delete("/events/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /events/treadmills ───────────────────────────────────────────────────

describe("GET /events/treadmills", () => {
	it("200 – retorna lista de esteiras", async () => {
		(treadmillRepository.findAll as jest.Mock).mockResolvedValue([mockTreadmill]);
		const res = await request(app).get("/events/treadmills");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([mockTreadmill]);
	});

	it("200 – retorna lista vazia", async () => {
		(treadmillRepository.findAll as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/events/treadmills");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /events/treadmills ──────────────────────────────────────────────────

describe("POST /events/treadmills", () => {
	it("201 – cria esteira", async () => {
		(treadmillRepository.create as jest.Mock).mockResolvedValue(mockTreadmill);
		const res = await request(app).post("/events/treadmills").send({ number: 5 });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 1, number: 5 });
	});

	it("400 – number ausente", async () => {
		const res = await request(app).post("/events/treadmills").send({});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── PATCH /events/treadmills/:id ─────────────────────────────────────────────

describe("PATCH /events/treadmills/:id", () => {
	it("200 – atualiza esteira existente", async () => {
		(treadmillRepository.update as jest.Mock).mockResolvedValue({ id: 1, number: 10 });
		const res = await request(app).patch("/events/treadmills/1").send({ number: 10 });
		expect(res.status).toBe(200);
		expect(res.body.number).toBe(10);
	});

	it("404 – esteira não encontrada", async () => {
		(treadmillRepository.update as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/events/treadmills/999").send({ number: 10 });
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── DELETE /events/treadmills/:id ────────────────────────────────────────────

describe("DELETE /events/treadmills/:id", () => {
	it("200 – deleta esteira existente", async () => {
		(treadmillRepository.hardDelete as jest.Mock).mockResolvedValue(mockTreadmill);
		const res = await request(app).delete("/events/treadmills/1");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 1 });
	});

	it("404 – esteira não encontrada", async () => {
		(treadmillRepository.hardDelete as jest.Mock).mockResolvedValue(null);
		const res = await request(app).delete("/events/treadmills/999");
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty("error");
	});
});
