import { Request, Response } from "express";
import { exportService } from "../services/exportService";

export const exportController = {
	async exportShifts(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const csv = await exportService.shiftsCsv(eventId);
			res.setHeader("Content-Type", "text/csv");
			res.setHeader("Content-Disposition", `attachment; filename="shifts-${eventId}.csv"`);
			res.status(200).send(csv);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async exportCheckpoints(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const csv = await exportService.checkpointsCsv(eventId);
			res.setHeader("Content-Type", "text/csv");
			res.setHeader("Content-Disposition", `attachment; filename="checkpoints-${eventId}.csv"`);
			res.status(200).send(csv);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
