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
  delete process.env.OPENROUTER_API_KEY;
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

describe("ocrService.extractFromImage – OpenRouter", () => {
  const fetchSpy = jest.spyOn(global, "fetch");
  const openRouterOk = (content: string) =>
    ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) }) as any;

  afterAll(() => fetchSpy.mockRestore());

  it("usa o OpenRouter primeiro quando a chave está configurada", async () => {
    process.env.OPENROUTER_API_KEY = "or-key";
    fetchSpy.mockResolvedValue(openRouterOk('{"speed":9,"distance":4.2,"pace":null,"time":"00:25:00"}'));

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result).toEqual({ speed: 9, distance: 4.2, pace: null, time: "00:25:00" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("passa para o próximo modelo quando o primeiro responde com erro", async () => {
    process.env.OPENROUTER_API_KEY = "or-key";
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: "overloaded" } }) } as any)
      .mockResolvedValueOnce(openRouterOk('{"speed":6,"distance":1,"pace":null,"time":null}'));

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result.distance).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("cai no Gemini direto quando todos os modelos do OpenRouter falham", async () => {
    process.env.OPENROUTER_API_KEY = "or-key";
    fetchSpy.mockRejectedValue(new Error("rede fora"));
    mockGenerateContent.mockResolvedValue(
      geminiResponse('{"speed":5,"distance":2.5,"pace":null,"time":null}')
    );

    const result = await ocrService.extractFromImage(buffer, "image/png");

    expect(result.distance).toBe(2.5);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("não chama o OpenRouter sem chave configurada", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiResponse('{"speed":5,"distance":2,"pace":null,"time":null}')
    );

    await ocrService.extractFromImage(buffer, "image/png");

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
