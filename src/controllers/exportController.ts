import { Request, Response } from "express";
import { exportService } from "../services/exportService";

export const exportController = {
	async exportShifts(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const buffer = await exportService.shiftsXlsx(eventId);
			res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
			res.setHeader("Content-Disposition", `attachment; filename="turnos-${eventId}.xlsx"`);
			res.status(200).send(buffer);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},

	async exportCheckpoints(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const buffer = await exportService.checkpointsXlsx(eventId);
			res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
			res.setHeader("Content-Disposition", `attachment; filename="checkpoints-${eventId}.xlsx"`);
			res.status(200).send(buffer);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},
};