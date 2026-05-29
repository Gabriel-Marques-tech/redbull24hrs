import { Request, Response } from "express";
import { shiftService } from "../services/shiftService";

function statusFromError(message: string): number {
	if (message.includes("não encontrad")) return 404;
	if (message.includes("em aberto") || message.includes("ocupada") || message.includes("em andamento"))
		return 409;
	if (message.includes("inválid")) return 400;
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
