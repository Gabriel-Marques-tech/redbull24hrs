import { Request, Response } from "express";
import { shiftService } from "../services/shiftService";

function statusFromError(message: string): number {
	if (message.includes("não encontrad")) return 404;
	if (message.includes("em aberto") || message.includes("ocupada") || message.includes("em andamento"))
		return 409;
	if (message.includes("inválid")) return 400;
	if (message.startsWith("RN")) return 422;
	return 500;
}

export const shiftController = {
	async startShift(req: Request, res: Response) {
		const { athlete_id, auditor_id, treadmill_id, km_start } = req.body;
		if (athlete_id == null || auditor_id == null || treadmill_id == null || km_start == null) {
			res.status(400).json({
				error: "Campos obrigatórios: athlete_id, auditor_id, treadmill_id, km_start",
			});
			return;
		}
		try {
			const shift = await shiftService.startShift(
				Number(athlete_id),
				Number(auditor_id),
				Number(treadmill_id),
				Number(km_start)
			);
			res.status(201).json(shift);
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
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

	async finishShift(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		const { km_end } = req.body;
		if (km_end == null) {
			res.status(400).json({ error: "Campos obrigatórios: km_end" });
			return;
		}
		try {
			const shift = await shiftService.finishShift(shift_id, Number(km_end));
			res.status(200).json(shift);
		} catch (error: any) {
			res.status(statusFromError(error.message)).json({ error: error.message });
		}
	},
};
