import { shiftRepository } from "../repositories/shiftRepository";

const CHECKPOINT_TYPES = ["mandatory", "voluntary"];

export const shiftService = {
	async startShift(
		athlete_id: number,
		auditor_id: number,
		treadmill_id: number,
		km_start: number
	) {
		if (km_start < 0) throw new Error("km inicial inválido: deve ser maior ou igual a zero");

		if (!(await shiftRepository.athleteExists(athlete_id)))
			throw new Error("Atleta não encontrado");

		// RF003 / RN28: evento deve ter equipes cadastradas
		// RF003 / RN17: cada equipe deve ter exatamente 16 corredores ativos
		const teams = await shiftRepository.validateTeamsForAthlete(athlete_id);
		if (teams.length === 0)
			throw new Error("RN28: nenhuma equipe cadastrada no evento do atleta");
		const invalid = teams.filter((t) => t.count !== 16);
		if (invalid.length > 0) {
			const detail = invalid.map((t) => `"${t.name}" (${t.count}/16)`).join(", ");
			throw new Error(`RN17: equipe(s) sem 16 corredores ativos: ${detail}`);
		}

		if (!(await shiftRepository.treadmillExists(treadmill_id)))
			throw new Error("Esteira não encontrada");

		if (!(await shiftRepository.auditorExists(auditor_id)))
			throw new Error("Auditor não encontrado");

		const openByAthlete = await shiftRepository.findOpenByAthlete(athlete_id);
		if (openByAthlete) throw new Error("Atleta já possui um turno em aberto");

		const openByTreadmill = await shiftRepository.findOpenByTreadmill(treadmill_id);
		if (openByTreadmill) throw new Error("Esteira ocupada por outro turno em andamento");

		return shiftRepository.start(athlete_id, auditor_id, treadmill_id, km_start);
	},

	async registerCheckpoint(shift_id: number, distance: number, type?: string) {
		const checkpointType = type ?? "voluntary";
		if (!CHECKPOINT_TYPES.includes(checkpointType))
			throw new Error("Tipo de checkpoint inválido: use 'mandatory' ou 'voluntary'");
		if (distance < 0) throw new Error("km do checkpoint inválido: deve ser maior ou igual a zero");

		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");
		if (shift.status !== "in_progress") throw new Error("Turno não está em andamento");

		const lastKm = await shiftRepository.lastCheckpointKm(shift_id);
		const floor = lastKm !== null ? lastKm : shift.km_start;
		if (distance < floor)
			throw new Error("km do checkpoint inválido: menor que o último km registrado");

		const lastTs = await shiftRepository.lastCheckpointTimestamp(shift_id);
		const reference = lastTs ?? shift.start_at;
		const gapMinutes = (Date.now() - new Date(reference).getTime()) / 60000;
		if (gapMinutes > 10)
			throw new Error("Checkpoint inválido: intervalo desde o último registro excede 10 minutos");

		return shiftRepository.addCheckpoint(shift_id, distance, checkpointType);
	},

	async correctCheckpoint(
		checkpoint_id: number,
		new_distance: number,
		author_id: number,
		author_role: string,
		justification?: string
	) {
		const checkpoint = await shiftRepository.findCheckpointById(checkpoint_id);
		if (!checkpoint) throw new Error("Checkpoint não encontrado");

		const shift = await shiftRepository.findById(checkpoint.shift_id);
		if (!shift) throw new Error("Turno não encontrado");

		if (new_distance < 0)
			throw new Error("distância inválida: deve ser maior ou igual a zero");

		const { prev, next } = await shiftRepository.findNeighborCheckpoints(
			checkpoint_id,
			checkpoint.shift_id
		);

		const floor = prev ?? shift.km_start;
		if (new_distance < floor)
			throw new Error("distância inválida: valor menor que o checkpoint anterior");

		if (next !== null && new_distance > next)
			throw new Error("distância inválida: valor maior que o checkpoint posterior");

		return shiftRepository.correctCheckpoint(
			checkpoint_id,
			new_distance,
			checkpoint.distance,
			author_id,
			author_role,
			justification
		);
	},

	async finishShift(shift_id: number, km_end: number) {
		if (km_end < 0) throw new Error("km final inválido: deve ser maior ou igual a zero");

		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");
		if (shift.status !== "in_progress") throw new Error("Turno não está em andamento");
		if (km_end < shift.km_start)
			throw new Error("km final inválido: menor que o km inicial");

		const lastKm = await shiftRepository.lastCheckpointKm(shift_id);
		if (lastKm !== null && km_end < lastKm)
			throw new Error("km final inválido: menor que o último checkpoint");

		const finished = await shiftRepository.finish(shift_id, km_end);
		if (!finished) throw new Error("Turno não está em andamento");
		return finished;
	},
};
