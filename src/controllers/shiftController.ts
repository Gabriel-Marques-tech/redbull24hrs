import { Request, Response } from "express";
import { shiftService } from "../services/shiftService";

function statusFromError(message: string): number {
	if (message.includes("não encontrad")) return 404;
	if (message.includes("em aberto") || message.includes("ocupada") || message.includes("em andamento") || message.includes("encerrado"))
		return 409;
	if (message.includes("inválid")) return 400;
	if (message.startsWith("RN")) return 422;
	return 500;
}

export const shiftController = {
	async startShift(req: Request, res: Response) {
		const { athlete_id, auditor_id, treadmill_id, km_start, operator_role } = req.body;
		if (athlete_id == null || auditor_id == null || treadmill_id == null || km_start == null) {
			res.status(400).json({
				error: "Campos obrigatórios: athlete_id, auditor_id, treadmill_id, km_start",
			});
			return;
		}
		const role = operator_role === 'manager' ? 'manager' : 'auditor'
		try {
			const shift = await shiftService.startShift(
				Number(athlete_id),
				Number(auditor_id),
				role,
				Number(treadmill_id),
				Number(km_start)
			);
			res.status(201).json(shift);
		} catch (error: any) {
			const status = statusFromError(error.message);
			const body: any = { error: error.message };
			if (error.conflictShiftId) {
				body.conflict_shift_id   = error.conflictShiftId;
				body.conflict_athlete    = error.conflictAthlete;
				body.conflict_treadmill  = error.conflictTreadmill;
				body.conflict_start_at   = error.conflictStartAt;
			}
			res.status(status).json(body);
		}
	},

	async listCheckpoints(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		if (isNaN(shift_id)) { res.status(400).json({ error: "ID inválido" }); return; }
		try {
			const checkpoints = await shiftService.listCheckpoints(shift_id);
			res.status(200).json(checkpoints);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async registerCheckpoint(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		const { distance, type } = req.body;
		if (distance == null) {
			res.status(400).json({ error: "Campos obrigatórios: distance" });
			return;
		}
		try {
			const checkpoint = await shiftService.registerCheckpoint(shift_id, Number(distance), type);
			res.status(201).json(checkpoint);
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
		}
	},

	async correctCheckpoint(req: Request, res: Response) {
		const checkpoint_id = Number(req.params.id);
		const { distance, justification } = req.body;

		if (distance == null) {
			res.status(400).json({ error: "Campos obrigatórios: distance" });
			return;
		}
		if (!req.user) {
			res.status(401).json({ error: "Não autenticado" });
			return;
		}

		try {
			const updated = await shiftService.correctCheckpoint(
				checkpoint_id,
				Number(distance),
				Number(req.user.id),
				req.user.role,
				justification
			);
			res.status(200).json(updated);
		} catch (error: any) {
			const status = error.message.includes("não encontrad")
				? 404
				: error.message.includes("inválid")
				? 422
				: 500;
			res.status(status).json({ error: error.message });
		}
	},

	async abandonShift(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		const forceClose = req.body?.force_close === true;
		try {
			await shiftService.abandonShift(shift_id, forceClose);
			res.status(200).json({ ok: true });
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
		}
	},

	async finishShift(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		const { km_end, athlete_id, duration_seconds } = req.body;
		if (km_end == null) {
			res.status(400).json({ error: "Campos obrigatórios: km_end" });
			return;
		}
		try {
			const shift = await shiftService.finishShift(
				shift_id,
				Number(km_end),
				athlete_id != null ? Number(athlete_id) : undefined,
				duration_seconds != null ? Number(duration_seconds) : undefined
			);
			res.status(200).json(shift);
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
		}
	},

	async updateShift(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		if (isNaN(shift_id)) { res.status(400).json({ error: "ID inválido" }); return; }
		if (!req.user || req.user.role !== 'manager') {
			res.status(403).json({ error: "Apenas managers podem editar turnos" });
			return;
		}
		const { athlete_id, km_start, km_end, start_at, end_at } = req.body;
		if (km_start == null || km_end == null) {
			res.status(400).json({ error: "Campos obrigatórios: km_start, km_end" });
			return;
		}
		try {
			const shift = await shiftService.updateShiftAdmin(shift_id, {
				athlete_id: athlete_id != null ? Number(athlete_id) : undefined,
				km_start: Number(km_start),
				km_end: Number(km_end),
				start_at: start_at || undefined,
				end_at: end_at || null,
			});
			res.status(200).json(shift);
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
		}
	},

	async getShiftStatus(req: Request, res: Response) {
		const id = Number(req.params.id);
		if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
		try {
			const shift = await shiftService.getShiftById(id);
			if (!shift) { res.status(404).json({ error: "Turno não encontrado" }); return; }
			res.status(200).json({ id: shift.id, status: shift.status });
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
