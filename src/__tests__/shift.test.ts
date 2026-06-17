import request from "supertest";
import app from "../app";

jest.mock("../repositories/shiftRepository", () => ({
	shiftRepository: {
		findById: jest.fn(),
		athleteExists: jest.fn(),
		validateTeamsForAthlete: jest.fn(),
		treadmillExists: jest.fn(),
		auditorExists: jest.fn(),
		findOpenByAthlete: jest.fn(),
		findOpenByTreadmill: jest.fn(),
		findOpenByTeamWithDetails: jest.fn(),
		eventStatusByAthlete: jest.fn(),
		eventStatusByShift: jest.fn(),
		abandon: jest.fn(),
		reassignAthlete: jest.fn(),
		adminUpdate: jest.fn(),
		listCheckpointsByShift: jest.fn(),
		start: jest.fn(),
		lastCheckpointKm: jest.fn(),
		lastCheckpointTimestamp: jest.fn(),
		addCheckpoint: jest.fn(),
		finish: jest.fn(),
	},
}));

import { shiftRepository } from "../repositories/shiftRepository";
import { verifyAccessToken } from "../utils/jwt";

const authHeaderTop = { Authorization: "Bearer valid.token.here" };

const openShift = { id: 10, status: "in_progress", athlete_id: 1, auditor_id: 3, treadmill_id: 2, km_start: 100 };
const completedShift = { ...openShift, status: "completed", km_end: 150, distance: 50 };

const validStart = { athlete_id: 1, auditor_id: 3, treadmill_id: 2, km_start: 100 };

const validTeams = [
	{ team_id: 1, name: "Alpha", count: 16 },
	{ team_id: 2, name: "Beta",  count: 16 },
];

const happyStart = () => {
	(shiftRepository.athleteExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.validateTeamsForAthlete as jest.Mock).mockResolvedValue(validTeams);
	(shiftRepository.treadmillExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.auditorExists as jest.Mock).mockResolvedValue(true);
	(shiftRepository.findOpenByAthlete as jest.Mock).mockResolvedValue(null);
	(shiftRepository.findOpenByTreadmill as jest.Mock).mockResolvedValue(null);
};

beforeEach(() => jest.clearAllMocks());

// Defaults para guardas de status de evento (RF: evento deve estar em andamento).
// Registrado após o clearAllMocks acima para reaplicar a cada teste.
beforeEach(() => {
	(shiftRepository.eventStatusByAthlete as jest.Mock).mockResolvedValue("in_progress");
	(shiftRepository.eventStatusByShift as jest.Mock).mockResolvedValue("in_progress");
	(shiftRepository.findOpenByTeamWithDetails as jest.Mock).mockResolvedValue(null);
});

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

	// RF003 – RN28/RN17
	it("422 – RN28: nenhuma equipe cadastrada no evento", async () => {
		happyStart();
		(shiftRepository.validateTeamsForAthlete as jest.Mock).mockResolvedValue([]);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/RN28/);
	});

	it("422 – equipe sem corredores ativos (count 0)", async () => {
		happyStart();
		(shiftRepository.validateTeamsForAthlete as jest.Mock).mockResolvedValue([
			{ team_id: 1, name: "Alpha", count: 0 },
			{ team_id: 2, name: "Beta",  count: 5 },
		]);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/sem corredores/);
		expect(res.body.error).toMatch(/Alpha/);
	});

	it("201 – inicia turno com qualquer quantidade de corredores > 0", async () => {
		happyStart();
		(shiftRepository.validateTeamsForAthlete as jest.Mock).mockResolvedValue([
			{ team_id: 1, name: "Alpha", count: 3 },
			{ team_id: 2, name: "Beta",  count: 20 },
		]);
		(shiftRepository.start as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).post("/audit/shifts/start").send(validStart);
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 10, status: "in_progress" });
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

// ─── Intervalo entre checkpoints ─────────────────────────────────────────────
// O service atual NÃO rejeita checkpoints por intervalo de tempo: a validação
// limita-se a tipo, distância e km mínimo. Estes testes documentam o
// comportamento real do endpoint (aceita independentemente do tempo decorrido).

describe("POST /audit/shifts/:id/checkpoints – intervalo de tempo", () => {
	it("201 – aceita checkpoint mesmo com intervalo > 10 min desde o último", async () => {
		const oldTs = new Date(Date.now() - 11 * 60 * 1000); // 11 minutos atrás
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(120);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(oldTs);
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 7, shift_id: 10, distance: 130, type: "voluntary" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 130 });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ distance: 130 });
	});

	it("201 – aceita checkpoint mesmo com intervalo > 10 min desde o início do turno (sem checkpoints)", async () => {
		const oldStart = { ...openShift, start_at: new Date(Date.now() - 15 * 60 * 1000) };
		(shiftRepository.findById as jest.Mock).mockResolvedValue(oldStart);
		(shiftRepository.lastCheckpointKm as jest.Mock).mockResolvedValue(null);
		(shiftRepository.lastCheckpointTimestamp as jest.Mock).mockResolvedValue(null);
		(shiftRepository.addCheckpoint as jest.Mock).mockResolvedValue({ id: 8, shift_id: 10, distance: 110, type: "voluntary" });
		const res = await request(app).post("/audit/shifts/10/checkpoints").send({ distance: 110 });
		expect(res.status).toBe(201);
	});

	it("201 – aceita checkpoint com intervalo curto (< 10 min)", async () => {
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

// ─── GET /audit/shifts/:id/status ─────────────────────────────────────────────

describe("GET /audit/shifts/:id/status", () => {
	it("200 – retorna id e status do turno", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		const res = await request(app).get("/audit/shifts/10/status").set(authHeaderTop);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ id: 10, status: "in_progress" });
	});

	it("404 – turno não encontrado", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).get("/audit/shifts/999/status").set(authHeaderTop);
		expect(res.status).toBe(404);
	});

	it("400 – id inválido", async () => {
		const res = await request(app).get("/audit/shifts/abc/status").set(authHeaderTop);
		expect(res.status).toBe(400);
	});

	it("401 – sem token de autenticação", async () => {
		const res = await request(app).get("/audit/shifts/10/status");
		expect(res.status).toBe(401);
	});
});

// ─── GET /audit/shifts/:id/checkpoints ────────────────────────────────────────

describe("GET /audit/shifts/:id/checkpoints", () => {
	it("200 – lista checkpoints do turno", async () => {
		const list = [
			{ id: 1, shift_id: 10, distance: 110, type: "voluntary" },
			{ id: 2, shift_id: 10, distance: 120, type: "mandatory" },
		];
		(shiftRepository.listCheckpointsByShift as jest.Mock).mockResolvedValue(list);
		const res = await request(app).get("/audit/shifts/10/checkpoints").set(authHeaderTop);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0]).toMatchObject({ distance: 110 });
	});

	it("400 – id inválido", async () => {
		const res = await request(app).get("/audit/shifts/abc/checkpoints").set(authHeaderTop);
		expect(res.status).toBe(400);
	});

	it("401 – sem token de autenticação", async () => {
		const res = await request(app).get("/audit/shifts/10/checkpoints");
		expect(res.status).toBe(401);
	});
});

// ─── PATCH /audit/shifts/:id/abandon ──────────────────────────────────────────

describe("PATCH /audit/shifts/:id/abandon", () => {
	it("200 – encerra turno em andamento", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.abandon as jest.Mock).mockResolvedValue(undefined);
		const res = await request(app).patch("/audit/shifts/10/abandon").send({});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
		expect(shiftRepository.abandon).toHaveBeenCalledWith(10, false);
	});

	it("200 – turno já fechado é ignorado (idempotente)", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(completedShift);
		const res = await request(app).patch("/audit/shifts/10/abandon").send({});
		expect(res.status).toBe(200);
		expect(shiftRepository.abandon).not.toHaveBeenCalled();
	});

	it("404 – turno não encontrado", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app).patch("/audit/shifts/999/abandon").send({});
		expect(res.status).toBe(404);
	});

	it("200 – force_close repassa flag ao repositório", async () => {
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.abandon as jest.Mock).mockResolvedValue(undefined);
		const res = await request(app).patch("/audit/shifts/10/abandon").send({ force_close: true });
		expect(res.status).toBe(200);
		expect(shiftRepository.abandon).toHaveBeenCalledWith(10, true);
	});
});

// ─── PATCH /audit/shifts/:id (edição admin – apenas manager) ──────────────────

describe("PATCH /audit/shifts/:id", () => {
	it("200 – manager edita turno", async () => {
		(verifyAccessToken as jest.Mock).mockReturnValueOnce({ sub: 7, email: "m@test.com", role: "manager", name: "Gerente" });
		(shiftRepository.findById as jest.Mock).mockResolvedValue(openShift);
		(shiftRepository.adminUpdate as jest.Mock).mockResolvedValue({ ...openShift, km_start: 100, km_end: 160 });
		const res = await request(app)
			.patch("/audit/shifts/10")
			.set(authHeaderTop)
			.send({ km_start: 100, km_end: 160 });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ km_end: 160 });
	});

	it("403 – auditor não pode editar", async () => {
		const res = await request(app)
			.patch("/audit/shifts/10")
			.set(authHeaderTop)
			.send({ km_start: 100, km_end: 160 });
		expect(res.status).toBe(403);
	});

	it("400 – campos km obrigatórios ausentes", async () => {
		(verifyAccessToken as jest.Mock).mockReturnValueOnce({ sub: 7, email: "m@test.com", role: "manager", name: "Gerente" });
		const res = await request(app)
			.patch("/audit/shifts/10")
			.set(authHeaderTop)
			.send({});
		expect(res.status).toBe(400);
	});

	it("401 – sem token de autenticação", async () => {
		const res = await request(app)
			.patch("/audit/shifts/10")
			.send({ km_start: 100, km_end: 160 });
		expect(res.status).toBe(401);
	});

	it("404 – turno não encontrado", async () => {
		(verifyAccessToken as jest.Mock).mockReturnValueOnce({ sub: 7, email: "m@test.com", role: "manager", name: "Gerente" });
		(shiftRepository.findById as jest.Mock).mockResolvedValue(null);
		const res = await request(app)
			.patch("/audit/shifts/999")
			.set(authHeaderTop)
			.send({ km_start: 100, km_end: 160 });
		expect(res.status).toBe(404);
	});
});
