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

		return shiftRepository.addCheckpoint(shift_id, distance, checkpointType);
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
