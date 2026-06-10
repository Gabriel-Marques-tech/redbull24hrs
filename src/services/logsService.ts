import { logsRepository, LogFilters } from "../repositories/logsRepository";

const LOG_TYPES = ["created", "updated", "finished"];

export const logsService = {
	async getLogs(filters: LogFilters) {
		if (filters.type != null && !LOG_TYPES.includes(filters.type))
			throw new Error("type inválido: use 'created', 'updated' ou 'finished'");

		return logsRepository.findLogs(filters);
	},
};
