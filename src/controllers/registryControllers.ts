import { Request, Response } from "express";
import { registryService } from "../services/registryServices";

export const registryController = {
	async createEvent(req: Request, res: Response) {
		const { manager_id, title, local, date } = req.body;

		if (!manager_id || !title || !local || !date) {
			res.status(400).json({ error: "Campos obrigatórios: manager_id, title, local, date" });
			return;
		}

		try {
			const event = await registryService.registerEvent(Number(manager_id), title, local, date);
			res.status(201).json(event);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async createTeam(req: Request, res: Response) {
		const event_id = Number(req.params.eventId);
		const { name } = req.body;

		if (!name) {
			res.status(400).json({ error: "Campos obrigatórios: name" });
			return;
		}

		try {
			const team = await registryService.registerTeam(event_id, name);
			res.status(201).json(team);
		} catch (error: any) {
			const status = error.message.includes("não encontrado") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async createAthlete(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		const { name, gender, cpf } = req.body;

		if (!name || !gender) {
			res.status(400).json({ error: "Campos obrigatórios: name, gender" });
			return;
		}

		try {
			const athlete = await registryService.registerAthlete(team_id, name, gender, cpf ?? null);
			res.status(201).json(athlete);
		} catch (error: any) {
			const status = error.message.includes("não encontrada") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async createTreadmill(req: Request, res: Response) {
		const { number } = req.body;

		if (number === undefined || number === null) {
			res.status(400).json({ error: "Campos obrigatórios: number" });
			return;
		}

		try {
			const treadmill = await registryService.registerTreadmill(Number(number));
			res.status(201).json(treadmill);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getEvents(_req: Request, res: Response) {
		try {
			const events = await registryService.listEvents();
			res.status(200).json(events);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getTeamsByEvent(req: Request, res: Response) {
		const event_id = Number(req.params.eventId);
		try {
			const teams = await registryService.listTeams(event_id);
			res.status(200).json(teams);
		} catch (error: any) {
			const status = error.message.includes("não encontrado") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async getAthletesByTeam(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		try {
			const athletes = await registryService.listAthletes(team_id);
			res.status(200).json(athletes);
		} catch (error: any) {
			const status = error.message.includes("não encontrada") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async getTreadmills(_req: Request, res: Response) {
		try {
			const treadmills = await registryService.listTreadmills();
			res.status(200).json(treadmills);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
