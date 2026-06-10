import request from "supertest";
import app from "../app";

jest.mock("../repositories/logsRepository", () => ({
	logsRepository: {
		findLogs: jest.fn(),
	},
}));

jest.mock("../utils/jwt", () => ({
	verifyAccessToken: jest.fn(() => ({ sub: 3, email: "auditor@test.com", role: "auditor", name: "Auditor" })),
}));

import { logsRepository } from "../repositories/logsRepository";

const authHeader = { Authorization: "Bearer valid.token.here" };

const sampleLogs = [
	{
		id: 1, shift_id: 3, checkpoint_id: null, type: "created",
		old_value: null, new_value: null, author_id: 2, author_role: "auditor",
		justification: null, timestamp: "2026-06-01T14:00:00.000Z",
	},
	{
		id: 2, shift_id: 3, checkpoint_id: 6, type: "updated",
		old_value: 130, new_value: 125, author_id: 2, author_role: "auditor",
		justification: "erro de leitura", timestamp: "2026-06-01T14:32:00.000Z",
	},
];

beforeEach(() => jest.clearAllMocks());

// ─── GET /audit/logs (RF024) ──────────────────────────────────────────────────

describe("GET /audit/logs – RF024 trilha de auditoria", () => {
	it("401 – sem token de autenticação", async () => {
		const res = await request(app).get("/audit/logs");
		expect(res.status).toBe(401);
	});

	it("200 – sem filtros retorna todos os logs em ordem cronológica", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue(sampleLogs);
		const res = await request(app).get("/audit/logs").set(authHeader);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(logsRepository.findLogs).toHaveBeenCalledWith({
			shift_id: null, checkpoint_id: null, type: null, author_id: null,
		});
	});

	it("200 – filtra por shift_id", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue(sampleLogs);
		const res = await request(app).get("/audit/logs?shift_id=3").set(authHeader);
		expect(res.status).toBe(200);
		expect(logsRepository.findLogs).toHaveBeenCalledWith(
			expect.objectContaining({ shift_id: 3 })
		);
	});

	it("200 – shift_id sem logs retorna array vazio (não é erro)", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/audit/logs?shift_id=999").set(authHeader);
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("400 – shift_id não numérico", async () => {
		const res = await request(app).get("/audit/logs?shift_id=abc").set(authHeader);
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/shift_id/i);
	});

	it("200 – filtra por checkpoint_id", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue([sampleLogs[1]]);
		const res = await request(app).get("/audit/logs?checkpoint_id=6").set(authHeader);
		expect(res.status).toBe(200);
		expect(logsRepository.findLogs).toHaveBeenCalledWith(
			expect.objectContaining({ checkpoint_id: 6 })
		);
	});

	it("200 – filtra por type=updated", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue([sampleLogs[1]]);
		const res = await request(app).get("/audit/logs?type=updated").set(authHeader);
		expect(res.status).toBe(200);
		expect(logsRepository.findLogs).toHaveBeenCalledWith(
			expect.objectContaining({ type: "updated" })
		);
	});

	it("400 – type inválido", async () => {
		const res = await request(app).get("/audit/logs?type=foo").set(authHeader);
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/type/i);
	});

	it("200 – combina shift_id e type (AND)", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue([sampleLogs[1]]);
		const res = await request(app).get("/audit/logs?shift_id=3&type=updated").set(authHeader);
		expect(res.status).toBe(200);
		expect(logsRepository.findLogs).toHaveBeenCalledWith(
			expect.objectContaining({ shift_id: 3, type: "updated" })
		);
	});

	it("200 – filtra por author_id", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue(sampleLogs);
		const res = await request(app).get("/audit/logs?author_id=2").set(authHeader);
		expect(res.status).toBe(200);
		expect(logsRepository.findLogs).toHaveBeenCalledWith(
			expect.objectContaining({ author_id: 2 })
		);
	});

	it("200 – banco sem nenhum log retorna array vazio", async () => {
		(logsRepository.findLogs as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/audit/logs").set(authHeader);
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("500 – erro inesperado no repositório", async () => {
		(logsRepository.findLogs as jest.Mock).mockRejectedValue(new Error("falha no banco"));
		const res = await request(app).get("/audit/logs").set(authHeader);
		expect(res.status).toBe(500);
	});
});

// ─── Imutabilidade (RN23): sem rotas de escrita/deleção em /audit/logs ─────────

describe("Imutabilidade da trilha (RN23)", () => {
	it("404 – DELETE /audit/logs/:id não existe", async () => {
		const res = await request(app).delete("/audit/logs/1").set(authHeader);
		expect(res.status).toBe(404);
	});

	it("404 – PATCH /audit/logs/:id não existe", async () => {
		const res = await request(app).patch("/audit/logs/1").set(authHeader);
		expect(res.status).toBe(404);
	});

	it("404 – PUT /audit/logs/:id não existe", async () => {
		const res = await request(app).put("/audit/logs/1").set(authHeader);
		expect(res.status).toBe(404);
	});
});
