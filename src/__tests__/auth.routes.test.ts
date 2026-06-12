import request from "supertest";
import app from "../app";

jest.mock("../services/authService", () => ({
	__esModule: true,
	default: {
		registerManager: jest.fn(),
		registerAuditor: jest.fn(),
		loginUser: jest.fn(),
		refresh: jest.fn(),
		logout: jest.fn(),
		listAuditors: jest.fn(),
	},
}));

jest.mock("../utils/jwt", () => ({
	verifyAccessToken: jest.fn(() => ({ sub: 7, email: "m@test.com", role: "manager", name: "Gerente" })),
}));

import AuthService from "../services/authService";
import { verifyAccessToken } from "../utils/jwt";

const authHeader = { Authorization: "Bearer valid.token.here" };

beforeEach(() => jest.clearAllMocks());

// ─── GET /auth/auditors ───────────────────────────────────────────────────────

describe("GET /auth/auditors", () => {
	it("200 – retorna lista de auditores", async () => {
		const auditors = [
			{ id: "1", name: "Auditor A", email: "a@test.com", registration_number: 10 },
			{ id: "2", name: "Auditor B", email: "b@test.com", registration_number: 11 },
		];
		(AuthService.listAuditors as jest.Mock).mockResolvedValue(auditors);
		const res = await request(app).get("/auth/auditors");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0]).toMatchObject({ name: "Auditor A" });
	});

	it("200 – retorna lista vazia", async () => {
		(AuthService.listAuditors as jest.Mock).mockResolvedValue([]);
		const res = await request(app).get("/auth/auditors");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("500 – erro inesperado no service", async () => {
		(AuthService.listAuditors as jest.Mock).mockRejectedValue(new Error("db down"));
		const res = await request(app).get("/auth/auditors");
		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe("GET /auth/me", () => {
	it("200 – devolve o usuário autenticado do token", async () => {
		const res = await request(app).get("/auth/me").set(authHeader);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 7, email: "m@test.com", role: "manager" });
	});

	it("401 – sem token de autenticação", async () => {
		const res = await request(app).get("/auth/me");
		expect(res.status).toBe(401);
	});

	it("401 – token inválido", async () => {
		(verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
			throw new Error("token inválido");
		});
		const res = await request(app).get("/auth/me").set(authHeader);
		expect(res.status).toBe(401);
	});
});
