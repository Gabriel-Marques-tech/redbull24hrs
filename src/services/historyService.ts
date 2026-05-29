import { historyRepository, HistoryFilters } from "../repositories/historyRepository";

export const historyService = {
	async getHistory(filters: HistoryFilters) {
		if (filters.event_id == null) throw new Error("event_id é obrigatório");
		return historyRepository.findByEvent(filters);
	},
};
