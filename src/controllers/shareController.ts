import { Request, Response } from "express";
import { shareRepository } from "../repositories/shareRepository";
import { emailService } from "../services/emailService";

function speedToPace(speedKmh: number): string {
	if (!speedKmh || speedKmh <= 0) return "—";
	const totalSeconds = 3600 / speedKmh;
	const min = Math.floor(totalSeconds / 60);
	const sec = Math.round(totalSeconds % 60);
	return `${min}:${String(sec).padStart(2, "0")}/km`;
}

export const shareController = {
	async cardPage(_req: Request, res: Response) {
		res.render("card-compartilhavel");
	},

	async athletePage(req: Request, res: Response) {
		const token = String(req.params.token);

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).send("Atleta não encontrado");
			return;
		}

		const km = `${Number(athlete.total_km).toFixed(1)}km`;
		const pace = speedToPace(Number(athlete.avg_speed));
		const params = new URLSearchParams({
			nome: athlete.name,
			equipe: athlete.team_name ?? "Red Bull 24H",
			km,
			pace,
		});

		res.redirect(`/share/card-compartilhavel?${params.toString()}`);
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
