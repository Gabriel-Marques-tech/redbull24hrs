const mockGenerateContent = jest.fn();
const mockGroqCreate = jest.fn();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}));

jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  })),
}));

import { ocrService } from "../services/ocrService";

const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const geminiResponse = (text: string) => ({
  response: { text: () => text },
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GROQ_API_KEY;
});

describe("ocrService.extractFromImage – Gemini", () => {
  it("extrai e valida os 4 campos do display", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse('{"speed":10,"distance":5,"pace":"05:30","time":"00:30:00"}')
    );

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result).toEqual({ speed: 10, distance: 5, pace: "05:30", time: "00:30:00" });
  });

  it("remove cercas markdown ```json antes de parsear", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse('```json\n{"speed":8,"distance":2,"pace":null,"time":null}\n```')
    );

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result.speed).toBe(8);
    expect(result.distance).toBe(2);
  });

  it("zera valores fora dos limites físicos", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse('{"speed":99,"distance":600,"pace":"abc","time":"99h"}')
    );

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result).toEqual({ speed: null, distance: null, pace: null, time: null });
  });
});

describe("ocrService.extractFromImage – fallback Groq", () => {
  it("recorre ao Groq quando o Gemini falha", async () => {
    process.env.GROQ_API_KEY = "groq-key";
    mockGenerateContent.mockRejectedValue(new Error("gemini down"));
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: '{"speed":7,"distance":3,"pace":null,"time":null}' } }],
    });

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(mockGroqCreate).toHaveBeenCalled();
    expect(result.speed).toBe(7);
  });

  it("lança erro final quando Gemini e Groq falham", async () => {
    mockGenerateContent.mockRejectedValue(new Error("gemini down"));
    // GROQ_API_KEY ausente → tryGroq lança "GROQ_API_KEY não configurada"

    await expect(
      ocrService.extractFromImage(buffer, "image/png")
    ).rejects.toThrow("OCR indisponível em todos os provedores");
  });
});
