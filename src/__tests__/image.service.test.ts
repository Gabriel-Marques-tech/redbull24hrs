const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock("../services/supabaseClient", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
}));

jest.mock("../repositories/imageRepository", () => ({
  imageRepository: {
    shiftExists: jest.fn(),
    setShiftImage: jest.fn(),
    setShiftOcr: jest.fn(),
    checkpointExists: jest.fn(),
    setCheckpointImage: jest.fn(),
    setCheckpointOcr: jest.fn(),
  },
}));

jest.mock("../services/ocrService", () => ({
  ocrService: {
    extractFromImage: jest.fn(),
  },
}));

import { imageService } from "../services/imageService";
import { imageRepository } from "../repositories/imageRepository";
import { ocrService } from "../services/ocrService";

const mockRepo = imageRepository as jest.Mocked<typeof imageRepository>;
const mockOcr = ocrService as jest.Mocked<typeof ocrService>;

const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "http://x/p.png" } });
});

describe("imageService.uploadShiftImage", () => {
  it("lança quando o turno não existe", async () => {
    mockRepo.shiftExists.mockResolvedValue(false);
    await expect(
      imageService.uploadShiftImage(1, buffer, "image/png")
    ).rejects.toThrow("Turno não encontrado");
  });

  it("faz upload, grava imagem e OCR quando há leitura", async () => {
    mockRepo.shiftExists.mockResolvedValue(true);
    mockOcr.extractFromImage.mockResolvedValue({ speed: 10, distance: 5, pace: null, time: null } as any);
    mockRepo.setShiftImage.mockResolvedValue({ image_url: "http://x/p.png" } as any);

    const result = await imageService.uploadShiftImage(1, buffer, "image/png");

    expect(mockUpload).toHaveBeenCalled();
    expect(mockRepo.setShiftImage).toHaveBeenCalledWith(1, "http://x/p.png");
    expect(mockRepo.setShiftOcr).toHaveBeenCalled();
    expect(result).toEqual({ image_url: "http://x/p.png", ocr: { speed: 10, distance: 5, pace: null, time: null } });
  });

  it("não grava OCR quando a extração falha", async () => {
    mockRepo.shiftExists.mockResolvedValue(true);
    mockOcr.extractFromImage.mockRejectedValue(new Error("ocr down"));
    mockRepo.setShiftImage.mockResolvedValue({ image_url: "http://x/p.png" } as any);

    const result = await imageService.uploadShiftImage(1, buffer, "image/png");

    expect(mockRepo.setShiftOcr).not.toHaveBeenCalled();
    expect(result.ocr).toBeNull();
  });

  it("propaga erro de upload do storage", async () => {
    mockRepo.shiftExists.mockResolvedValue(true);
    mockOcr.extractFromImage.mockResolvedValue(null as any);
    mockUpload.mockResolvedValue({ error: { message: "bucket cheio" } });

    await expect(
      imageService.uploadShiftImage(1, buffer, "image/png")
    ).rejects.toThrow("Erro no upload: bucket cheio");
  });
});

describe("imageService.uploadCheckpointImage", () => {
  it("lança quando o checkpoint não existe", async () => {
    mockRepo.checkpointExists.mockResolvedValue(false);
    await expect(
      imageService.uploadCheckpointImage(1, buffer, "image/png")
    ).rejects.toThrow("Checkpoint não encontrado");
  });

  it("faz upload e grava OCR do checkpoint quando há leitura", async () => {
    mockRepo.checkpointExists.mockResolvedValue(true);
    mockOcr.extractFromImage.mockResolvedValue({ speed: 9, distance: 4, pace: null, time: null } as any);
    mockRepo.setCheckpointImage.mockResolvedValue({ image_url: "http://x/p.png" } as any);

    const result = await imageService.uploadCheckpointImage(5, buffer, "image/png");

    expect(mockRepo.setCheckpointImage).toHaveBeenCalledWith(5, "http://x/p.png");
    expect(mockRepo.setCheckpointOcr).toHaveBeenCalled();
    expect(result.image_url).toBe("http://x/p.png");
  });

  it("não grava OCR do checkpoint quando a extração falha", async () => {
    mockRepo.checkpointExists.mockResolvedValue(true);
    mockOcr.extractFromImage.mockRejectedValue(new Error("ocr down"));
    mockRepo.setCheckpointImage.mockResolvedValue({ image_url: "http://x/p.png" } as any);

    const result = await imageService.uploadCheckpointImage(5, buffer, "image/png");

    expect(mockRepo.setCheckpointOcr).not.toHaveBeenCalled();
    expect(result.ocr).toBeNull();
  });
});
