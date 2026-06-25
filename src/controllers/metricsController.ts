import { Request, Response } from "express";
import { metricsService } from "../services/metricsService";

export const metricsController = {
	async getDashboard(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getDashboard(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getTeamKm(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getTeamKm(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getAthleteKm(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getAthleteKm(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getGenderKm(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getGenderKm(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getCompetitionPace(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getCompetitionPace(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getTvSummary(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		try {
			const data = await metricsService.getTvSummary(eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getAvgDistancePerShift(req: Request, res: Response) {
		const athleteId = Number(req.params.athleteId);
		try {
			const data = await metricsService.getAvgDistancePerShift(athleteId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getKmSnapshots(req: Request, res: Response) {
		const athleteId = Number(req.params.athleteId);
		const eventId   = Number(req.query.event_id);
		if (!eventId) {
			res.status(400).json({ error: "Parâmetro obrigatório: event_id" });
			return;
		}
		try {
			const data = await metricsService.getKmSnapshots(athleteId, eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	async getAthletePerformance(req: Request, res: Response) {
		const athleteId = Number(req.params.athleteId);
		const eventId   = req.query.event_id ? Number(req.query.event_id) : undefined;
		try {
			const data = await metricsService.getAthletePerformance(athleteId, eventId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},

	// RF050 – link público de desempenho (RN36): sem auth, só dados do atleta
	async shareAthletePerformance(req: Request, res: Response) {
		const athleteId = Number(req.params.athleteId);
		if (isNaN(athleteId)) {
			res.status(400).json({ error: "athleteId inválido" });
			return;
		}
		try {
			const data = await metricsService.getAthletePerformance(athleteId);
			res.status(200).json(data);
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	},
};
