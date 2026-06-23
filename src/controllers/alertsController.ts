import { Request, Response } from "express";
import { alertsService } from "../services/alertsService";

export const alertsController = {
	async getAlerts(req: Request, res: Response) {
		const eventId = Number(req.query.event_id);
		if (!eventId) {
			res.status(400).json({ error: "Parâmetro obrigatório: event_id" });
			return;
		}
		try {
			const data = await alertsService.getAlerts(eventId);
			res.status(200).json(data);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},
};
