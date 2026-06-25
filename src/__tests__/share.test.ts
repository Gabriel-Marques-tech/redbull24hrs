import request from "supertest";
import app from "../app";

jest.mock("../repositories/shareRepository", () => ({
	shareRepository: {
		generateTokensForEvent: jest.fn(),
		athletesByEvent: jest.fn(),
		athleteCardByToken: jest.fn(),
	},
}));

jest.mock("../services/emailService", () => ({
	emailService: {
		sendShareLink: jest.fn(),
	},
}));

jest.mock("../utils/jwt", () => ({
	verifyAccessToken: jest.fn(() => ({
		sub: 1, email: "m@test.com", role: "manager", name: "Gerente",
	})),
}));

import { shareRepository } from "../repositories/shareRepository";
import { emailService } from "../services/emailService";

const mockRepo = shareRepository as jest.Mocked<typeof shareRepository>;
const mockEmail = emailService as jest.Mocked<typeof emailService>;
const managerHeader = { Authorization: "Bearer valid.token" };

const mockAthlete = {
	id: 1,
	name: "Ana Lima",
	email: "ana@teste.com",
	gender: "F",
	share_token: "uuid-abc-123",
	team_name: "Equipe Alpha",
	event_id: 1,
	event_name: "Red Bull 24H",
	total_km: 8.5,
	total_shifts: 3,
	avg_speed: 17.0,
	best_shift_km: 3.2,
};

beforeEach(() => jest.clearAllMocks());

// ─── GET /share/athlete/:token ────────────────────────────────────────────────

describe("GET /share/athlete/:token", () => {
	it("404 quando token não existe", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(null);
		const res = await request(app).get("/share/athlete/token-invalido");
		expect(res.status).toBe(404);
	});

	it("302 redireciona para o card quando token válido", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(mockAthlete);
		const res = await request(app).get("/share/athlete/uuid-abc-123");
		expect(res.status).toBe(302);
		expect(res.headers.location).toContain("/share/card-compartilhavel");
		expect(mockRepo.athleteCardByToken).toHaveBeenCalledWith("uuid-abc-123");
	});
});

// ─── GET /share/athlete/:token/data ──────────────────────────────────────────

describe("GET /share/athlete/:token/data", () => {
	it("404 quando token não existe", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(null);
		const res = await request(app).get("/share/athlete/nope/data");
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Atleta não encontrado" });
	});

	it("200 retorna dados do atleta", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(mockAthlete);
		const res = await request(app).get("/share/athlete/uuid-abc-123/data");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ name: "Ana Lima", total_km: 8.5 });
	});
});

// ─── GET /share/event/:eventId/athletes ──────────────────────────────────────

describe("GET /share/event/:eventId/athletes", () => {
	it("401 sem auth", async () => {
		const res = await request(app).get("/share/event/1/athletes");
		expect(res.status).toBe(401);
	});

	it("400 com eventId inválido", async () => {
		const res = await request(app)
			.get("/share/event/abc/athletes")
			.set(managerHeader);
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "ID inválido" });
	});

	it("200 retorna lista de atletas", async () => {
		mockRepo.athletesByEvent.mockResolvedValue([mockAthlete]);
		const res = await request(app)
			.get("/share/event/1/athletes")
			.set(managerHeader);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0]).toMatchObject({ name: "Ana Lima" });
	});

	it("200 retorna lista vazia", async () => {
		mockRepo.athletesByEvent.mockResolvedValue([]);
		const res = await request(app)
			.get("/share/event/1/athletes")
			.set(managerHeader);
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// ─── POST /share/athlete/:token/send-email ────────────────────────────────────

describe("POST /share/athlete/:token/send-email", () => {
	it("401 sem auth", async () => {
		const res = await request(app).post("/share/athlete/uuid-abc-123/send-email");
		expect(res.status).toBe(401);
	});

	it("404 quando token não existe", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(null);
		const res = await request(app)
			.post("/share/athlete/nope/send-email")
			.set(managerHeader);
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Atleta não encontrado" });
	});

	it("400 quando atleta não tem email", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue({ ...mockAthlete, email: null });
		const res = await request(app)
			.post("/share/athlete/uuid-abc-123/send-email")
			.set(managerHeader);
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "Atleta sem email cadastrado" });
	});

	it("400 quando atleta não tem share_token", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue({ ...mockAthlete, share_token: null });
		const res = await request(app)
			.post("/share/athlete/uuid-abc-123/send-email")
			.set(managerHeader);
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ error: "Link ainda não gerado. Finalize o evento primeiro." });
	});

	it("200 envia email com sucesso", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(mockAthlete);
		mockEmail.sendShareLink.mockResolvedValue(undefined);
		const res = await request(app)
			.post("/share/athlete/uuid-abc-123/send-email")
			.set(managerHeader);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, sent_to: "ana@teste.com" });
		expect(mockEmail.sendShareLink).toHaveBeenCalledWith(
			"ana@teste.com", "Ana Lima", "uuid-abc-123"
		);
	});

	it("500 quando emailService lança exceção", async () => {
		mockRepo.athleteCardByToken.mockResolvedValue(mockAthlete);
		mockEmail.sendShareLink.mockRejectedValue(new Error("Resend error"));
		const res = await request(app)
			.post("/share/athlete/uuid-abc-123/send-email")
			.set(managerHeader);
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ error: "Falha ao enviar email" });
	});
});
