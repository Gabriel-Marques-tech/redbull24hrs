import { historyService } from "../services/historyService";

jest.mock("../repositories/historyRepository", () => ({
	historyRepository: {
		findByEvent: jest.fn().mockResolvedValue([]),
	},
}));

import { historyRepository } from "../repositories/historyRepository";

beforeEach(() => jest.clearAllMocks());

describe("historyService.getHistory", () => {
	it("throws when event_id is null", async () => {
		await expect(
			historyService.getHistory({ event_id: null as any })
		).rejects.toThrow("event_id é obrigatório");
	});

	it("throws when event_id is undefined", async () => {
		await expect(
			historyService.getHistory({ event_id: undefined as any })
		).rejects.toThrow("event_id é obrigatório");
	});

	it("calls repository with valid event_id", async () => {
		await historyService.getHistory({ event_id: 1 });
		expect(historyRepository.findByEvent).toHaveBeenCalledWith({ event_id: 1 });
	});
});
