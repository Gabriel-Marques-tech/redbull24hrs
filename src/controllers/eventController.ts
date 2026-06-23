import { Request, Response } from "express";
import { eventService } from "../services/eventService";

export const eventController = {
	async getEvents(_req: Request, res: Response) {
		try {
			const events = await eventService.listEvents();
			res.status(200).json(events);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},

	async createEvent(req: Request, res: Response) {
		const { manager_id, title, local, date } = req.body;
		if (!manager_id || !title || !local || !date) {
			res.status(400).json({ error: "Campos obrigatórios: manager_id, title, local, date" });
			return;
		}
		try {
			const event = await eventService.registerEvent(Number(manager_id), title, local, date);
			res.status(201).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},

	async getEvent(req: Request, res: Response) {
		const id = Number(req.params.id);
		try {
			const event = await eventService.getEvent(id);
			res.status(200).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(404).json({ error: error.message });
		}
	},

	async updateEvent(req: Request, res: Response) {
		const id = Number(req.params.id);
		const { title, local, date } = req.body;
		try {
			const event = await eventService.updateEvent(id, { title, local, date });
			res.status(200).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(404).json({ error: error.message });
		}
	},

	async deleteEvent(req: Request, res: Response) {
		const id = Number(req.params.id);
		try {
			const event = await eventService.deleteEvent(id);
			res.status(200).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(404).json({ error: error.message });
		}
	},

	async startEvent(req: Request, res: Response) {
		const id = Number(req.params.id);
		if (isNaN(id)) {
			res.status(400).json({ error: "ID inválido" });
			return;
		}
		try {
			const event = await eventService.startEvent(id);
			res.status(200).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			const status = error.message.includes("não encontrad")
				? 404
				: error.message.includes("já está")
				? 409
				: 500;
			res.status(status).json({ error: error.message });
		}
	},

	async finishEvent(req: Request, res: Response) {
		const id = Number(req.params.id);
		if (isNaN(id)) {
			res.status(400).json({ error: "ID inválido" });
			return;
		}
		try {
			const event = await eventService.finishEvent(id);
			res.status(200).json(event);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			const status = error.message.includes("não encontrad")
				? 404
				: error.message.includes("já está") || error.message.includes("ainda não foi iniciado")
				? 409
				: 500;
			res.status(status).json({ error: error.message });
		}
	},

	async getTreadmills(_req: Request, res: Response) {
		try {
			const treadmills = await eventService.listTreadmills();
			res.status(200).json(treadmills);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},

	async createTreadmill(req: Request, res: Response) {
		const { number } = req.body;
		if (number === undefined || number === null) {
			res.status(400).json({ error: "Campos obrigatórios: number" });
			return;
		}
		try {
			const treadmill = await eventService.registerTreadmill(Number(number));
			res.status(201).json(treadmill);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(500).json({ error: error.message });
		}
	},

	async updateTreadmill(req: Request, res: Response) {
		const id = Number(req.params.id);
		const { number } = req.body;
		if (number === undefined || number === null) {
			res.status(400).json({ error: "Campos obrigatórios: number" });
			return;
		}
		try {
			const treadmill = await eventService.updateTreadmill(id, Number(number));
			res.status(200).json(treadmill);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(404).json({ error: error.message });
		}
	},

	async deleteTreadmill(req: Request, res: Response) {
		const id = Number(req.params.id);
		try {
			const treadmill = await eventService.deleteTreadmill(id);
			res.status(200).json(treadmill);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			res.status(404).json({ error: error.message });
		}
	},
};
