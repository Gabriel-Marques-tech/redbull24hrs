import { shiftRepository } from "../repositories/shiftRepository";

const CHECKPOINT_TYPES = ["mandatory", "voluntary"];

export const shiftService = {
	async startShift(
		athlete_id: number,
		operator_id: number,
		operator_role: 'auditor' | 'manager',
		treadmill_id: number,
		km_start: number
	) {
		if (km_start < 0) throw new Error("km inicial inválido: deve ser maior ou igual a zero");

		if (!(await shiftRepository.athleteExists(athlete_id)))
			throw new Error("Atleta não encontrado");

		// Auditor só opera com evento em andamento (pending = não iniciado, finished = encerrado)
		const eventStatus = await shiftRepository.eventStatusByAthlete(athlete_id);
		if (eventStatus !== "in_progress")
			throw new Error(
				eventStatus === "finished"
					? "Evento encerrado: não é possível iniciar novos turnos"
					: "Evento não está em andamento: aguarde o início da competição"
			);

		// RF003 / RN28: evento deve ter equipes cadastradas
		const teams = await shiftRepository.validateTeamsForAthlete(athlete_id);
		if (teams.length === 0)
			throw new Error("RN28: nenhuma equipe cadastrada no evento do atleta");

		if (!(await shiftRepository.treadmillExists(treadmill_id)))
			throw new Error("Esteira não encontrada");

		if (!(await shiftRepository.auditorExists(operator_id)))
			throw new Error("Operador não encontrado");

		const openByTeam = await shiftRepository.findOpenByTeamWithDetails(athlete_id);
		if (openByTeam) {
			const idleMs = Date.now() - new Date(openByTeam.last_activity).getTime();
			const idleMin = idleMs / 60000;
			if (idleMin > 15) {
				// Turno abandonado sem encerramento — fecha automaticamente
				await shiftRepository.abandon(openByTeam.id);
			} else {
				const err: any = new Error("Equipe já possui um turno em andamento");
				err.conflictShiftId   = openByTeam.id;
				err.conflictAthlete   = openByTeam.athlete_name;
				err.conflictTreadmill = openByTeam.treadmill_number;
				err.conflictStartAt   = openByTeam.start_at;
				throw err;
			}
		}

		const openByAthlete = await shiftRepository.findOpenByAthlete(athlete_id);
		if (openByAthlete) throw new Error("Atleta já possui um turno em aberto");

		const openByTreadmill = await shiftRepository.findOpenByTreadmill(treadmill_id);
		if (openByTreadmill) throw new Error("Esteira ocupada por outro turno em andamento");

		return shiftRepository.start(athlete_id, operator_id, operator_role, treadmill_id, km_start);
	},

	async listCheckpoints(shift_id: number) {
		return shiftRepository.listCheckpointsByShift(shift_id);
	},

	async registerCheckpoint(shift_id: number, distance: number, type?: string) {
		const checkpointType = type ?? "voluntary";
		if (!CHECKPOINT_TYPES.includes(checkpointType))
			throw new Error("Tipo de checkpoint inválido: use 'mandatory' ou 'voluntary'");
		if (distance < 0) throw new Error("km do checkpoint inválido: deve ser maior ou igual a zero");

		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");
		if (shift.status !== "in_progress") throw new Error("Turno não está em andamento");

		const eventStatus = await shiftRepository.eventStatusByShift(shift_id);
		if (eventStatus !== "in_progress")
			throw new Error("Evento não está em andamento: operação não permitida");

		const lastKm = await shiftRepository.lastCheckpointKm(shift_id);
		const floor = lastKm !== null ? lastKm : shift.km_start;
		if (distance < floor)
			throw new Error("km do checkpoint inválido: menor que o último km registrado");

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

		const eventStatus = await shiftRepository.eventStatusByShift(checkpoint.shift_id);
		if (eventStatus !== "in_progress")
			throw new Error("Evento não está em andamento: operação não permitida");

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

	async abandonShift(shift_id: number, forceClose = false) {
		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");
		if (shift.status !== "in_progress") return; // já fechado, ignora

		await shiftRepository.abandon(shift_id, forceClose);
	},

	async finishShift(shift_id: number, km_end: number, athlete_id?: number, duration_seconds?: number) {
		if (km_end < 0) throw new Error("km final inválido: deve ser maior ou igual a zero");

		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");
		if (shift.status !== "in_progress") throw new Error("Turno não está em andamento");

		const eventStatus = await shiftRepository.eventStatusByShift(shift_id);
		if (eventStatus !== "in_progress")
			throw new Error("Evento não está em andamento: operação não permitida");

		if (km_end < shift.km_start)
			throw new Error("km final inválido: menor que o km inicial");

		const lastKm = await shiftRepository.lastCheckpointKm(shift_id);
		if (lastKm !== null && km_end < lastKm)
			throw new Error("km final inválido: menor que o último checkpoint");

		// Troca de corredor opcional: corrige a quem o turno pertence
		if (athlete_id != null && athlete_id !== shift.athlete_id) {
			if (!(await shiftRepository.athleteExists(athlete_id)))
				throw new Error("Atleta não encontrado");
			await shiftRepository.reassignAthlete(shift_id, athlete_id);
		}

		// Duração editada precisa ser positiva; senão usa NOW() (passa undefined)
		let safeDuration = duration_seconds;
		if (safeDuration != null && (!Number.isFinite(safeDuration) || safeDuration <= 0)) {
			safeDuration = undefined;
		}

		const finished = await shiftRepository.finish(shift_id, km_end, safeDuration);
		if (!finished) throw new Error("Turno não está em andamento");
		return finished;
	},

	async updateShiftAdmin(
		shift_id: number,
		fields: { athlete_id?: number; km_start: number; km_end: number; start_at?: string; end_at?: string | null }
	) {
		const shift = await shiftRepository.findById(shift_id);
		if (!shift) throw new Error("Turno não encontrado");

		if (fields.km_start < 0) throw new Error("km inicial inválido: deve ser maior ou igual a zero");
		if (fields.km_end < fields.km_start) throw new Error("km final inválido: menor que o km inicial");

		if (fields.athlete_id != null && fields.athlete_id !== shift.athlete_id) {
			if (!(await shiftRepository.athleteExists(fields.athlete_id)))
				throw new Error("Atleta não encontrado");
		}

		// Início/fim como wall-clock (sem timezone); valida fim >= início
		if (fields.start_at && fields.end_at) {
			if (new Date(fields.end_at) < new Date(fields.start_at))
				throw new Error("Horário inválido: fim antes do início");
		}

		const updated = await shiftRepository.adminUpdate(shift_id, fields);
		if (!updated) throw new Error("Turno não encontrado");
		return updated;
	},

	async getShiftById(id: number) {
		return shiftRepository.findById(id);
	},
};
