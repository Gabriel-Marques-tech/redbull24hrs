import { teamService } from "../services/teamService";

jest.mock("../repositories/eventRepository", () => ({
  eventRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("../repositories/teamRepository", () => ({
  teamRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  },
}));

jest.mock("../repositories/athleteRepository", () => ({
  athleteRepository: {
    create: jest.fn(),
    findByTeamId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  },
}));

jest.mock("../repositories/treadmillRepository", () => ({
  treadmillRepository: {
    create: jest.fn(),
  },
}));

jest.mock("../utils/supabaseStorage", () => ({
  removeFromStorage: jest.fn(),
}));

import { eventRepository } from "../repositories/eventRepository";
import { teamRepository } from "../repositories/teamRepository";
import { athleteRepository } from "../repositories/athleteRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";
import { removeFromStorage } from "../utils/supabaseStorage";

const mockEventRepo = eventRepository as jest.Mocked<typeof eventRepository>;
const mockTeamRepo = teamRepository as jest.Mocked<typeof teamRepository>;
const mockAthleteRepo = athleteRepository as jest.Mocked<typeof athleteRepository>;
const mockTreadmillRepo = treadmillRepository as jest.Mocked<typeof treadmillRepository>;
const mockRemove = removeFromStorage as jest.MockedFunction<typeof removeFromStorage>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("teamService.registerTeam", () => {
  it("throws when event not found", async () => {
    mockEventRepo.findById.mockResolvedValue(null);
    await expect(teamService.registerTeam(99, "Team A")).rejects.toThrow(
      "Evento não encontrado"
    );
  });

  it("happy path — creates team and 2 treadmills", async () => {
    mockEventRepo.findById.mockResolvedValue({ id: 1 } as any);
    mockTeamRepo.findAll.mockResolvedValue([]);
    const mockTeam = { id: 10, name: "Team A", event_id: 1 };
    mockTeamRepo.create.mockResolvedValue(mockTeam as any);
    mockTreadmillRepo.create.mockResolvedValue({} as any);

    const result = await teamService.registerTeam(1, "Team A");

    expect(mockTeamRepo.create).toHaveBeenCalledWith("Team A", 1);
    expect(mockTreadmillRepo.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockTeam);
  });
});

describe("teamService.getTeam", () => {
  it("throws when team not found", async () => {
    mockTeamRepo.findById.mockResolvedValue(null);
    await expect(teamService.getTeam(99)).rejects.toThrow(
      "Equipe não encontrada"
    );
  });
});

describe("teamService.updateTeam", () => {
  it("throws when team not found", async () => {
    mockTeamRepo.update.mockResolvedValue(null);
    await expect(teamService.updateTeam(99, "New Name")).rejects.toThrow(
      "Equipe não encontrada"
    );
  });
});

describe("teamService.deleteTeam", () => {
  it("throws when team not found", async () => {
    mockTeamRepo.softDelete.mockResolvedValue(null);
    await expect(teamService.deleteTeam(99)).rejects.toThrow(
      "Equipe não encontrada"
    );
  });
});

describe("teamService.registerAthlete", () => {
  it("throws when team not found", async () => {
    mockTeamRepo.findById.mockResolvedValue(null);
    await expect(
      teamService.registerAthlete(99, "João", "M", null)
    ).rejects.toThrow("Equipe não encontrada");
  });
});

describe("teamService.listAthletes", () => {
  it("throws when team not found", async () => {
    mockTeamRepo.findById.mockResolvedValue(null);
    await expect(teamService.listAthletes(99)).rejects.toThrow(
      "Equipe não encontrada"
    );
  });
});

describe("teamService.getAthlete", () => {
  it("throws when athlete not found", async () => {
    mockTeamRepo.findById.mockResolvedValue({ id: 1 } as any);
    mockAthleteRepo.findById.mockResolvedValue(null);
    await expect(teamService.getAthlete(1, 99)).rejects.toThrow(
      "Atleta não encontrado"
    );
  });
});

describe("teamService.updateAthlete", () => {
  it("remove a foto antiga ao trocar image_url", async () => {
    mockTeamRepo.findById.mockResolvedValue({ id: 1 } as any);
    mockAthleteRepo.findById.mockResolvedValue({ id: 5, image_url: "http://x/old.png" } as any);
    mockAthleteRepo.update.mockResolvedValue({ id: 5, image_url: "http://x/new.png" } as any);

    await teamService.updateAthlete(1, 5, { image_url: "http://x/new.png" });

    expect(mockRemove).toHaveBeenCalledWith("http://x/old.png");
  });
});
