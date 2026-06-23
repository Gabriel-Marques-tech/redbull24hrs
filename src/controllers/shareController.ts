import { Request, Response } from "express";
import { shareRepository } from "../repositories/shareRepository";

export const shareController = {
	async athletePage(req: Request, res: Response) {
		const token = String(req.params.token);
		if (!token) {
			res.status(400).send("Token inválido");
			return;
		}

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).send("Atleta não encontrado");
			return;
		}

		res.render("share-athlete", { athlete });
	},

	async athleteData(req: Request, res: Response) {
		const token = String(req.params.token);
		if (!token) {
			res.status(400).json({ error: "Token inválido" });
			return;
		}

		const athlete = await shareRepository.athleteCardByToken(token);
		if (!athlete) {
			res.status(404).json({ error: "Atleta não encontrado" });
			return;
		}

		res.status(200).json(athlete);
	},
};
