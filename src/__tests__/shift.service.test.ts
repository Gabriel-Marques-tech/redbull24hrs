import { shiftService } from "../services/shiftService";

jest.mock("../repositories/shiftRepository", () => ({
  shiftRepository: {
    athleteExists: jest.fn(),
    eventStatusByAthlete: jest.fn(),
    validateTeamsForAthlete: jest.fn(),
    treadmillExists: jest.fn(),
    auditorExists: jest.fn(),
    findOpenByTeamWithDetails: jest.fn(),
    findOpenByAthlete: jest.fn(),
    findOpenByTreadmill: jest.fn(),
    start: jest.fn(),
    findById: jest.fn(),
    eventStatusByShift: jest.fn(),
    lastCheckpointKm: jest.fn(),
    addCheckpoint: jest.fn(),
    listCheckpointsByShift: jest.fn(),
    findCheckpointById: jest.fn(),
    findNeighborCheckpoints: jest.fn(),
    correctCheckpoint: jest.fn(),
    abandon: jest.fn(),
    finish: jest.fn(),
    reassignAthlete: jest.fn(),
    adminUpdate: jest.fn(),
  },
}));

import { shiftRepository } from "../repositories/shiftRepository";
const mockRepo = shiftRepository as jest.Mocked<typeof shiftRepository>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("shiftService.startShift", () => {
  it("throws when km_start < 0", async () => {
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, -1)
    ).rejects.toThrow("km inicial inválido");
  });

  it("throws when athlete not found", async () => {
    mockRepo.athleteExists.mockResolvedValue(false);
    await expect(
      shiftService.startShift(99, 1, "auditor", 1, 0)
    ).rejects.toThrow("Atleta não encontrado");
  });

  it("throws when event not in_progress", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("pending");
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Evento não está em andamento");
  });

  it("throws when event is finished", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("finished");
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Evento encerrado");
  });

  it("throws when a team has no active runners", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("in_progress");
    mockRepo.validateTeamsForAthlete.mockResolvedValue([
      { team_id: 1, name: "Team A", count: 0 },
    ]);
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("sem corredores");
  });

  it("allows starting with any number of runners greater than zero", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("in_progress");
    mockRepo.validateTeamsForAthlete.mockResolvedValue([
      { team_id: 1, name: "Team A", count: 3 },
    ]);
    mockRepo.treadmillExists.mockResolvedValue(true);
    mockRepo.auditorExists.mockResolvedValue(true);
    mockRepo.findOpenByTeamWithDetails.mockResolvedValue(null);
    mockRepo.findOpenByAthlete.mockResolvedValue(null);
    mockRepo.findOpenByTreadmill.mockResolvedValue(null);
    mockRepo.start.mockResolvedValue({ id: 1 });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).resolves.toBeDefined();
  });

  it("throws when treadmill is occupied", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("in_progress");
    mockRepo.validateTeamsForAthlete.mockResolvedValue([
      { team_id: 1, name: "Team A", count: 16 },
    ]);
    mockRepo.treadmillExists.mockResolvedValue(true);
    mockRepo.auditorExists.mockResolvedValue(true);
    mockRepo.findOpenByTeamWithDetails.mockResolvedValue(null);
    mockRepo.findOpenByAthlete.mockResolvedValue(null);
    mockRepo.findOpenByTreadmill.mockResolvedValue({ id: 5 });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Esteira ocupada");
  });

  it("throws when athlete already has an open shift", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue("in_progress");
    mockRepo.validateTeamsForAthlete.mockResolvedValue([
      { team_id: 1, name: "Team A", count: 16 },
    ]);
    mockRepo.treadmillExists.mockResolvedValue(true);
    mockRepo.auditorExists.mockResolvedValue(true);
    mockRepo.findOpenByTeamWithDetails.mockResolvedValue(null);
    mockRepo.findOpenByAthlete.mockResolvedValue({ id: 10 });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Atleta já possui");
  });
});

describe("shiftService.registerCheckpoint", () => {
  it("throws on invalid checkpoint type", async () => {
    await expect(
      shiftService.registerCheckpoint(1, 5, "unknown")
    ).rejects.toThrow("Tipo de checkpoint inválido");
  });

  it("throws when checkpoint km < last km", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue("in_progress");
    mockRepo.lastCheckpointKm.mockResolvedValue(10);
    await expect(
      shiftService.registerCheckpoint(1, 5, "voluntary")
    ).rejects.toThrow("menor que o último km registrado");
  });
});

describe("shiftService.correctCheckpoint", () => {
  it("throws when new_distance < prev neighbor", async () => {
    mockRepo.findCheckpointById.mockResolvedValue({
      id: 1,
      shift_id: 1,
      distance: 10,
    } as any);
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 5,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue("in_progress");
    mockRepo.findNeighborCheckpoints.mockResolvedValue({ prev: 8, next: null });
    await expect(
      shiftService.correctCheckpoint(1, 3, 99, "auditor")
    ).rejects.toThrow("menor que o checkpoint anterior");
  });

  it("throws when new_distance > next neighbor", async () => {
    mockRepo.findCheckpointById.mockResolvedValue({
      id: 1,
      shift_id: 1,
      distance: 10,
    } as any);
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue("in_progress");
    mockRepo.findNeighborCheckpoints.mockResolvedValue({ prev: null, next: 15 });
    await expect(
      shiftService.correctCheckpoint(1, 20, 99, "auditor")
    ).rejects.toThrow("maior que o checkpoint posterior");
  });
});

describe("shiftService.finishShift", () => {
  it("throws when km_end < km_start", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 10,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue("in_progress");
    mockRepo.lastCheckpointKm.mockResolvedValue(null);
    await expect(shiftService.finishShift(1, 5)).rejects.toThrow(
      "menor que o km inicial"
    );
  });

  it("throws when shift is not in_progress", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "finished",
      km_start: 0,
      athlete_id: 1,
    } as any);
    await expect(shiftService.finishShift(1, 10)).rejects.toThrow(
      "Turno não está em andamento"
    );
  });
});

describe("shiftService.updateShiftAdmin", () => {
  it("throws when km_end < km_start", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "finished",
      km_start: 0,
      athlete_id: 1,
    } as any);
    await expect(
      shiftService.updateShiftAdmin(1, { km_start: 10, km_end: 5 })
    ).rejects.toThrow("km final inválido: menor que o km inicial");
  });

  it("throws when km_start < 0", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "finished",
      km_start: 0,
      athlete_id: 1,
    } as any);
    await expect(
      shiftService.updateShiftAdmin(1, { km_start: -1, km_end: 5 })
    ).rejects.toThrow("km inicial inválido");
  });
});
