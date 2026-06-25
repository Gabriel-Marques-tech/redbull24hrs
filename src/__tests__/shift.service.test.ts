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
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "pending", paused_at: null });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Evento não está em andamento");
  });

  it("throws when event is finished", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "finished", paused_at: null });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Evento encerrado");
  });

  it("throws when a team has no active runners", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.validateTeamsForAthlete.mockResolvedValue([
      { team_id: 1, name: "Team A", count: 0 },
    ]);
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("sem corredores");
  });

  it("allows starting with any number of runners greater than zero", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
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
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
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

  it("throws when reassigned athlete not found", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "finished",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.athleteExists.mockResolvedValue(false);
    await expect(
      shiftService.updateShiftAdmin(1, { km_start: 0, km_end: 10, athlete_id: 999 })
    ).rejects.toThrow("Atleta não encontrado");
  });

  it("throws when end_at is before start_at", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "finished",
      km_start: 0,
      athlete_id: 1,
    } as any);
    await expect(
      shiftService.updateShiftAdmin(1, {
        km_start: 0,
        km_end: 10,
        start_at: "2026-06-01T10:00:00",
        end_at: "2026-06-01T09:00:00",
      })
    ).rejects.toThrow("fim antes do início");
  });
});

// ─── openByTeam idle branches ────────────────────────────────────────────────

const setupValidStart = () => {
  mockRepo.athleteExists.mockResolvedValue(true);
  mockRepo.eventStatusByAthlete.mockResolvedValue({ status: "in_progress", paused_at: null });
  mockRepo.validateTeamsForAthlete.mockResolvedValue([
    { team_id: 1, name: "Team A", count: 16 },
  ]);
  mockRepo.treadmillExists.mockResolvedValue(true);
  mockRepo.auditorExists.mockResolvedValue(true);
};

describe("shiftService.startShift – openByTeam idle", () => {
  it("auto-abandons team shift when idle > 15 min and starts new shift", async () => {
    setupValidStart();
    const oldTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    mockRepo.findOpenByTeamWithDetails.mockResolvedValue({
      id: 99,
      last_activity: oldTime,
      athlete_name: "João",
      treadmill_number: 3,
      start_at: oldTime,
    });
    mockRepo.findOpenByAthlete.mockResolvedValue(null);
    mockRepo.findOpenByTreadmill.mockResolvedValue(null);
    mockRepo.abandon.mockResolvedValue(undefined);
    mockRepo.start.mockResolvedValue({ id: 1 });

    const result = await shiftService.startShift(1, 1, "auditor", 1, 0);
    expect(mockRepo.abandon).toHaveBeenCalledWith(99);
    expect(result).toEqual({ id: 1 });
  });

  it("throws conflict error when team shift idle ≤ 15 min", async () => {
    setupValidStart();
    const recentTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockRepo.findOpenByTeamWithDetails.mockResolvedValue({
      id: 88,
      last_activity: recentTime,
      athlete_name: "Maria",
      treadmill_number: 2,
      start_at: recentTime,
    });

    const err: any = await shiftService
      .startShift(1, 1, "auditor", 1, 0)
      .catch((e) => e);
    expect(err.message).toBe("Equipe já possui um turno em andamento");
    expect(err.conflictShiftId).toBe(88);
    expect(err.conflictAthlete).toBe("Maria");
  });
});

// ─── registerCheckpoint event not in_progress ────────────────────────────────

describe("shiftService.registerCheckpoint – evento encerrado", () => {
  it("throws when event is not in_progress", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "finished", paused_at: null });
    await expect(
      shiftService.registerCheckpoint(1, 5, "voluntary")
    ).rejects.toThrow("Evento não está em andamento");
  });
});

// ─── correctCheckpoint event not in_progress ─────────────────────────────────

describe("shiftService.correctCheckpoint – evento encerrado", () => {
  it("throws when event is not in_progress", async () => {
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
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "pending", paused_at: null });
    await expect(
      shiftService.correctCheckpoint(1, 10, 99, "manager")
    ).rejects.toThrow("Evento não está em andamento");
  });
});

// ─── finishShift extra branches ───────────────────────────────────────────────

describe("shiftService.finishShift – ramos extras", () => {
  it("throws when event is not in_progress", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "finished", paused_at: null });
    await expect(shiftService.finishShift(1, 10)).rejects.toThrow(
      "Evento não está em andamento"
    );
  });

  it("throws when km_end < last checkpoint km", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.lastCheckpointKm.mockResolvedValue(15);
    await expect(shiftService.finishShift(1, 10)).rejects.toThrow(
      "menor que o último checkpoint"
    );
  });

  it("throws when reassigned athlete not found", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.lastCheckpointKm.mockResolvedValue(null);
    mockRepo.athleteExists.mockResolvedValue(false);
    await expect(shiftService.finishShift(1, 10, 999)).rejects.toThrow(
      "Atleta não encontrado"
    );
  });

  it("resets invalid duration (≤ 0) to undefined before calling finish", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.lastCheckpointKm.mockResolvedValue(null);
    mockRepo.finish.mockResolvedValue({ id: 1, status: "completed" });

    await shiftService.finishShift(1, 10, undefined, -5);
    expect(mockRepo.finish).toHaveBeenCalledWith(1, 10, undefined, undefined);
  });

  it("resets non-finite duration to undefined before calling finish", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.lastCheckpointKm.mockResolvedValue(null);
    mockRepo.finish.mockResolvedValue({ id: 1, status: "completed" });

    await shiftService.finishShift(1, 10, undefined, NaN);
    expect(mockRepo.finish).toHaveBeenCalledWith(1, 10, undefined, undefined);
  });

  it("reatribui o atleta quando athlete_id difere do turno", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
      athlete_id: 1,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({ status: "in_progress", paused_at: null });
    mockRepo.lastCheckpointKm.mockResolvedValue(null);
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.finish.mockResolvedValue({ id: 1, status: "completed" });

    await shiftService.finishShift(1, 10, 2);

    expect(mockRepo.reassignAthlete).toHaveBeenCalledWith(1, 2);
  });
});

describe("shiftService.startShift – pausa", () => {
  it("throws when event is paused", async () => {
    mockRepo.athleteExists.mockResolvedValue(true);
    mockRepo.eventStatusByAthlete.mockResolvedValue({
      status: "in_progress",
      paused_at: "2026-06-01T10:00:00Z",
    });
    await expect(
      shiftService.startShift(1, 1, "auditor", 1, 0)
    ).rejects.toThrow("Competição pausada");
  });
});

describe("shiftService.registerCheckpoint – pausa", () => {
  it("throws when event is paused", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      status: "in_progress",
      km_start: 0,
    } as any);
    mockRepo.eventStatusByShift.mockResolvedValue({
      status: "in_progress",
      paused_at: "2026-06-01T10:00:00Z",
    });
    await expect(
      shiftService.registerCheckpoint(1, 5, "voluntary")
    ).rejects.toThrow("Competição pausada");
  });
});
