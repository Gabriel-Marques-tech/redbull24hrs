import { Request, Response } from "express";
import { historyService } from "../services/historyService";

export const historyController = {
	async getHistory(req: Request, res: Response) {
		const event_id = Number(req.query.event_id);
		if (!event_id) {
			res.status(400).json({ error: "Parâmetro obrigatório: event_id" });
			return;
		}
		const team_id     = req.query.team_id     ? Number(req.query.team_id)     : undefined;
		const treadmill_id = req.query.treadmill_id ? Number(req.query.treadmill_id) : undefined;
		const athlete_id  = req.query.athlete_id  ? Number(req.query.athlete_id)  : undefined;

		try {
			const entries = await historyService.getHistory({ event_id, team_id, treadmill_id, athlete_id });
			res.status(200).json(entries);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
