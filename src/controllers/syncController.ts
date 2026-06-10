import { Request, Response } from "express";
import { syncService } from "../services/syncService";

export const syncController = {
	async sync(req: Request, res: Response) {
		const { records } = req.body;

		if (!Array.isArray(records)) {
			res.status(400).json({ error: "Campo obrigatório: records (array)" });
			return;
		}

		try {
			const result = await syncService.syncCheckpoints(records);
			res.status(201).json(result);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
