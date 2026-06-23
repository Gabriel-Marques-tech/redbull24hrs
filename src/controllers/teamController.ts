import { Request, Response } from "express";
import { teamService } from "../services/teamService";

export const teamController = {
	async getTeams(req: Request, res: Response) {
		const event_id = req.query.event_id ? Number(req.query.event_id) : undefined;
		try {
			const teams = await teamService.listTeams(event_id);
			res.status(200).json(teams);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async createTeam(req: Request, res: Response) {
		const { event_id, name } = req.body;
		if (!event_id || !name) {
			res.status(400).json({ error: "Campos obrigatórios: event_id, name" });
			return;
		}
		try {
			const team = await teamService.registerTeam(Number(event_id), name);
			res.status(201).json(team);
		} catch (error: any) {
			const status = error.message.includes("não encontrado") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async getTeam(req: Request, res: Response) {
		const id = Number(req.params.id);
		try {
			const team = await teamService.getTeam(id);
			res.status(200).json(team);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async updateTeam(req: Request, res: Response) {
		const id = Number(req.params.id);
		const { name } = req.body;
		if (!name) {
			res.status(400).json({ error: "Campos obrigatórios: name" });
			return;
		}
		try {
			const team = await teamService.updateTeam(id, name);
			res.status(200).json(team);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async deleteTeam(req: Request, res: Response) {
		const id = Number(req.params.id);
		try {
			const team = await teamService.deleteTeam(id);
			res.status(200).json(team);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async getAthletes(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		try {
			const athletes = await teamService.listAthletes(team_id);
			res.status(200).json(athletes);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async createAthlete(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		const { name, gender, cpf, email } = req.body;
		if (!name || !gender) {
			res.status(400).json({ error: "Campos obrigatórios: name, gender" });
			return;
		}
		try {
			const athlete = await teamService.registerAthlete(team_id, name, gender, cpf ?? null, email ?? null);
			res.status(201).json(athlete);
		} catch (error: any) {
			if (error.code === "23505") {
				res.status(409).json({ error: "CPF já cadastrado" });
				return;
			}
			if (error.code === "23514") {
				res.status(400).json({ error: "CPF inválido: precisa ter 11 dígitos" });
				return;
			}
			const status = error.message.includes("não encontrada") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async getAthlete(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		const id = Number(req.params.id);
		try {
			const athlete = await teamService.getAthlete(team_id, id);
			res.status(200).json(athlete);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async updateAthlete(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		const id = Number(req.params.id);
		const { name, gender, cpf, email } = req.body;
		try {
			const athlete = await teamService.updateAthlete(team_id, id, { name, gender, cpf, email });
			res.status(200).json(athlete);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},

	async deleteAthlete(req: Request, res: Response) {
		const team_id = Number(req.params.teamId);
		const id = Number(req.params.id);
		try {
			const athlete = await teamService.deleteAthlete(team_id, id);
			res.status(200).json(athlete);
		} catch (error: any) {
			res.status(404).json({ error: error.message });
		}
	},
};
