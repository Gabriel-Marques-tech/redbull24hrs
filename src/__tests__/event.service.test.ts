import { eventService } from "../services/eventService";

jest.mock("../repositories/eventRepository", () => ({
  eventRepository: {
    createWithManager: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    start: jest.fn(),
    finish: jest.fn(),
  },
}));

jest.mock("../repositories/treadmillRepository", () => ({
  treadmillRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByTeam: jest.fn(),
    update: jest.fn(),
    hardDelete: jest.fn(),
  },
}));

import { eventRepository } from "../repositories/eventRepository";
const mockRepo = eventRepository as jest.Mocked<typeof eventRepository>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("eventService.getEvent", () => {
  it("throws when event not found", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(eventService.getEvent(999)).rejects.toThrow(
      "Evento não encontrado"
    );
  });
});

describe("eventService.updateEvent", () => {
  it("throws when event not found", async () => {
    mockRepo.update.mockResolvedValue(null);
    await expect(
      eventService.updateEvent(999, { title: "New" })
    ).rejects.toThrow("Evento não encontrado");
  });
});

describe("eventService.deleteEvent", () => {
  it("throws when event not found", async () => {
    mockRepo.softDelete.mockResolvedValue(null);
    await expect(eventService.deleteEvent(999)).rejects.toThrow(
      "Evento não encontrado"
    );
  });
});

describe("eventService.startEvent", () => {
  it("throws when event is already in_progress", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, status: "in_progress" } as any);
    await expect(eventService.startEvent(1)).rejects.toThrow(
      "Evento já está em andamento"
    );
  });

  it("throws when event is already finished", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, status: "finished" } as any);
    await expect(eventService.startEvent(1)).rejects.toThrow(
      "Evento já está encerrado"
    );
  });
});

describe("eventService.finishEvent", () => {
  it("throws when event is pending (not started)", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, status: "pending" } as any);
    await expect(eventService.finishEvent(1)).rejects.toThrow(
      "Evento ainda não foi iniciado"
    );
  });

  it("throws when event is already finished", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, status: "finished" } as any);
    await expect(eventService.finishEvent(1)).rejects.toThrow(
      "Evento já está encerrado"
    );
  });
});

describe("eventService.registerEvent", () => {
  it("happy path — calls createWithManager and returns result", async () => {
    const mockEvent = { id: 1, title: "Race", local: "SP", date: "2026-01-01" };
    mockRepo.createWithManager.mockResolvedValue(mockEvent as any);

    const result = await eventService.registerEvent(
      1,
      "Race",
      "SP",
      "2026-01-01"
    );

    expect(mockRepo.createWithManager).toHaveBeenCalledWith(
      "Race",
      "SP",
      "2026-01-01",
      1
    );
    expect(result).toEqual(mockEvent);
  });
});
