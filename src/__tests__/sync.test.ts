import request from "supertest";
import app from "../app";

jest.mock("../repositories/syncRepository", () => ({
	syncRepository: {
		shiftExists: jest.fn(),
		shiftIsActive: jest.fn(),
		insertCheckpoint: jest.fn(),
	},
}));

jest.mock("../utils/jwt", () => ({
	verifyAccessToken: jest.fn(() => ({ sub: 2, email: "auditor@test.com", role: "auditor", name: "Auditor" })),
}));

import { syncRepository } from "../repositories/syncRepository";

const authHeader = { Authorization: "Bearer valid.token.here" };

// SHA256 hex válido (64 chars hex)
const syncId1 = "a".repeat(64);
const syncId2 = "b".repeat(64);
const syncId3 = "c".repeat(64);

const validRecord = {
	sync_id: syncId1,
	shift_id: 3,
	distance: 142,
	checkpoint_type: "mandatory",
	timestamp: "2026-06-01T10:03:00Z",
};

const happyRepo = () => {
	(syncRepository.shiftExists as jest.Mock).mockResolvedValue(true);
	(syncRepository.shiftIsActive as jest.Mock).mockResolvedValue(true);
	(syncRepository.insertCheckpoint as jest.Mock).mockResolvedValue(true);
};

beforeEach(() => jest.clearAllMocks());

// ─── POST /audit/sync (RF026) ─────────────────────────────────────────────────

describe("POST /audit/sync – RF026 sincronização offline", () => {
	it("401 – sem token", async () => {
		const res = await request(app).post("/audit/sync").send({ records: [validRecord] });
		expect(res.status).toBe(401);
	});

	it("400 – body sem campo records", async () => {
		const res = await request(app).post("/audit/sync").set(authHeader).send({});
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/records/i);
	});

	it("400 – records não é array", async () => {
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: "foo" });
		expect(res.status).toBe(400);
	});

	it("201 – batch vazio retorna zeros", async () => {
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [] });
		expect(res.status).toBe(201);
		expect(res.body).toEqual({ inserted: 0, skipped: 0, errors: [] });
	});

	it("201 – insere 2 records válidos", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [
				validRecord,
				{ ...validRecord, sync_id: syncId2, distance: 145 },
			],
		});
		expect(res.status).toBe(201);
		expect(res.body.inserted).toBe(2);
		expect(res.body.skipped).toBe(0);
		expect(res.body.errors).toHaveLength(0);
	});

	it("201 – duplicata (sync_id existente) → skipped", async () => {
		happyRepo();
		(syncRepository.insertCheckpoint as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [
				validRecord,
				{ ...validRecord, sync_id: syncId2 }, // simula duplicata
			],
		});
		expect(res.status).toBe(201);
		expect(res.body.inserted).toBe(1);
		expect(res.body.skipped).toBe(1);
	});

	it("201 – turno não encontrado → errors[]", async () => {
		(syncRepository.shiftExists as jest.Mock).mockResolvedValue(false);
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [validRecord] });
		expect(res.status).toBe(201);
		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].reason).toMatch(/não encontrado/);
		expect(res.body.inserted).toBe(0);
	});

	it("201 – turno não em andamento → errors[]", async () => {
		(syncRepository.shiftExists as jest.Mock).mockResolvedValue(true);
		(syncRepository.shiftIsActive as jest.Mock).mockResolvedValue(false);
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [validRecord] });
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/não está em andamento/);
	});

	it("201 – record sem sync_id → errors[]", async () => {
		happyRepo();
		const { sync_id, ...noId } = validRecord;
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [noId] });
		expect(res.status).toBe(201);
		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].reason).toMatch(/sync_id/i);
	});

	it("201 – sync_id com formato inválido → errors[]", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [{ ...validRecord, sync_id: "nao-e-sha256" }],
		});
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/inválido/i);
	});

	it("201 – shift_id não inteiro → errors[]", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [{ ...validRecord, shift_id: "abc" }],
		});
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/shift_id/i);
	});

	it("201 – distance negativa → errors[]", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [{ ...validRecord, distance: -1 }],
		});
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/distance/i);
	});

	it("201 – timestamp inválido → errors[]", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [{ ...validRecord, timestamp: "nao-e-data" }],
		});
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/timestamp/i);
	});

	it("201 – checkpoint_type inválido → errors[]", async () => {
		happyRepo();
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [{ ...validRecord, checkpoint_type: "foo" }],
		});
		expect(res.status).toBe(201);
		expect(res.body.errors[0].reason).toMatch(/checkpoint_type/i);
	});

	it("201 – checkpoint_type omitido usa 'voluntary'", async () => {
		happyRepo();
		const { checkpoint_type, ...noType } = validRecord;
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [noType] });
		expect(res.status).toBe(201);
		expect(res.body.inserted).toBe(1);
		expect(syncRepository.insertCheckpoint).toHaveBeenCalledWith(
			expect.objectContaining({ checkpoint_type: "voluntary" })
		);
	});

	it("201 – mistura: 1 inserido + 1 skipped + 1 erro", async () => {
		(syncRepository.shiftExists as jest.Mock).mockResolvedValue(true);
		(syncRepository.shiftIsActive as jest.Mock).mockResolvedValue(true);
		(syncRepository.insertCheckpoint as jest.Mock)
			.mockResolvedValueOnce(true)   // inserido
			.mockResolvedValueOnce(false);  // skipped
		const res = await request(app).post("/audit/sync").set(authHeader).send({
			records: [
				validRecord,
				{ ...validRecord, sync_id: syncId2, distance: 145 },
				{ ...validRecord, sync_id: "invalido" }, // erro validação
			],
		});
		expect(res.status).toBe(201);
		expect(res.body.inserted).toBe(1);
		expect(res.body.skipped).toBe(1);
		expect(res.body.errors).toHaveLength(1);
	});

	it("500 – erro inesperado no repositório", async () => {
		(syncRepository.shiftExists as jest.Mock).mockResolvedValue(true);
		(syncRepository.shiftIsActive as jest.Mock).mockResolvedValue(true);
		(syncRepository.insertCheckpoint as jest.Mock).mockRejectedValue(new Error("db crash"));
		const res = await request(app).post("/audit/sync").set(authHeader).send({ records: [validRecord] });
		expect(res.status).toBe(500);
	});
});
