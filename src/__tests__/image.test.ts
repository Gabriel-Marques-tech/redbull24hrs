import request from "supertest";
import app from "../app";

jest.mock("../middlewares/authMiddleware", () => ({
	__esModule: true,
	default: {
		requireAuth: (_req: any, _res: any, next: any) => next(),
		requireRole: () => (_req: any, _res: any, next: any) => next(),
		requirePageAuth: (_req: any, _res: any, next: any) => next(),
	},
}));

jest.mock("../services/imageService", () => ({
	imageService: {
		uploadShiftImage: jest.fn(),
		uploadCheckpointImage: jest.fn(),
	},
}));

jest.mock("../services/ocrService", () => ({
	ocrService: {
		extractFromImage: jest.fn(),
	},
}));

import { imageService } from "../services/imageService";
import { ocrService } from "../services/ocrService";

const fakeImage = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // assinatura PNG fictícia

beforeEach(() => jest.clearAllMocks());

// ─── POST /audit/ocr ──────────────────────────────────────────────────────────

describe("POST /audit/ocr", () => {
	it("200 – devolve texto extraído da imagem", async () => {
		(ocrService.extractFromImage as jest.Mock).mockResolvedValue("KM 130");
		const res = await request(app)
			.post("/audit/ocr")
			.attach("image", fakeImage, "leitura.png");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ocr: "KM 130" });
	});

	it("400 – nenhuma imagem enviada", async () => {
		const res = await request(app).post("/audit/ocr").send({});
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/imagem/i);
	});

	it("500 – erro inesperado no OCR", async () => {
		(ocrService.extractFromImage as jest.Mock).mockRejectedValue(new Error("ocr down"));
		const res = await request(app)
			.post("/audit/ocr")
			.attach("image", fakeImage, "leitura.png");
		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("error");
	});
});

// ─── PATCH /audit/shifts/:id/image ────────────────────────────────────────────

describe("PATCH /audit/shifts/:id/image", () => {
	it("200 – grava imagem do turno", async () => {
		(imageService.uploadShiftImage as jest.Mock).mockResolvedValue({ image_url: "http://x/s.png", ocr: "KM 130" });
		const res = await request(app)
			.patch("/audit/shifts/10/image")
			.attach("image", fakeImage, "s.png");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ image_url: "http://x/s.png" });
	});

	it("400 – ID inválido", async () => {
		const res = await request(app)
			.patch("/audit/shifts/abc/image")
			.attach("image", fakeImage, "s.png");
		expect(res.status).toBe(400);
	});

	it("400 – nenhuma imagem enviada", async () => {
		const res = await request(app).patch("/audit/shifts/10/image").send({});
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/imagem/i);
	});

	it("404 – turno não encontrado", async () => {
		(imageService.uploadShiftImage as jest.Mock).mockRejectedValue(new Error("Turno não encontrado"));
		const res = await request(app)
			.patch("/audit/shifts/999/image")
			.attach("image", fakeImage, "s.png");
		expect(res.status).toBe(404);
	});

	it("500 – erro inesperado no service", async () => {
		(imageService.uploadShiftImage as jest.Mock).mockRejectedValue(new Error("storage down"));
		const res = await request(app)
			.patch("/audit/shifts/10/image")
			.attach("image", fakeImage, "s.png");
		expect(res.status).toBe(500);
	});
});

// ─── PATCH /audit/checkpoints/:id/image ───────────────────────────────────────

describe("PATCH /audit/checkpoints/:id/image", () => {
	it("200 – grava imagem do checkpoint", async () => {
		(imageService.uploadCheckpointImage as jest.Mock).mockResolvedValue({ image_url: "http://x/c.png", ocr: null });
		const res = await request(app)
			.patch("/audit/checkpoints/5/image")
			.attach("image", fakeImage, "c.png");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ image_url: "http://x/c.png" });
	});

	it("400 – ID inválido", async () => {
		const res = await request(app)
			.patch("/audit/checkpoints/abc/image")
			.attach("image", fakeImage, "c.png");
		expect(res.status).toBe(400);
	});

	it("400 – nenhuma imagem enviada", async () => {
		const res = await request(app).patch("/audit/checkpoints/5/image").send({});
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/imagem/i);
	});

	it("404 – checkpoint não encontrado", async () => {
		(imageService.uploadCheckpointImage as jest.Mock).mockRejectedValue(new Error("Checkpoint não encontrado"));
		const res = await request(app)
			.patch("/audit/checkpoints/999/image")
			.attach("image", fakeImage, "c.png");
		expect(res.status).toBe(404);
	});

	it("500 – erro inesperado no service", async () => {
		(imageService.uploadCheckpointImage as jest.Mock).mockRejectedValue(new Error("storage down"));
		const res = await request(app)
			.patch("/audit/checkpoints/5/image")
			.attach("image", fakeImage, "c.png");
		expect(res.status).toBe(500);
	});
});
