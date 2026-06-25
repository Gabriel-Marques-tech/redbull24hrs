import { Request, Response } from "express";
import { shareRepository } from "../repositories/shareRepository";
import { emailService } from "../services/emailService";

export const shareController = {
	async athletePage(req: Request, res: Response) {
		const token = String(req.params.token);

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).send("Atleta não encontrado");
			return;
		}

		res.render("share-athlete", { athlete });
	},

	async athleteData(req: Request, res: Response) {
		const token = String(req.params.token);

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).json({ error: "Atleta não encontrado" });
			return;
		}

		res.status(200).json(athlete);
	},

	async eventAthletes(req: Request, res: Response) {
		const eventId = Number(req.params.eventId);
		if (isNaN(eventId)) {
			res.status(400).json({ error: "ID inválido" });
			return;
		}

		const athletes = await shareRepository.athletesByEvent(eventId);
		res.status(200).json(athletes);
	},

	async sendEmail(req: Request, res: Response) {
		const token = String(req.params.token);

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).json({ error: "Atleta não encontrado" });
			return;
		}

		if (!athlete.email) {
			res.status(400).json({ error: "Atleta sem email cadastrado" });
			return;
		}

		if (!athlete.share_token) {
			res.status(400).json({ error: "Link ainda não gerado. Finalize o evento primeiro." });
			return;
		}

		try {
			await emailService.sendShareLink(athlete.email, athlete.name, athlete.share_token);
			res.status(200).json({ ok: true, sent_to: athlete.email });
		} catch (err: any) {
			console.error("[Share] Erro ao enviar email:", err?.message);
			res.status(500).json({ error: "Falha ao enviar email" });
		}
	},
};
