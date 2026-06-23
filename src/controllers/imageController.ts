import { Request, Response } from "express";
import { imageService } from "../services/imageService";

export const imageController = {
	async uploadShiftImage(req: Request, res: Response) {
		const shift_id = Number(req.params.id);
		if (isNaN(shift_id)) {
			res.status(400).json({ error: "ID inválido" });
			return;
		}
		if (!req.file) {
			res.status(400).json({ error: "Nenhuma imagem enviada" });
			return;
		}
		try {
			const result = await imageService.uploadShiftImage(shift_id, req.file.buffer, req.file.mimetype);
			res.status(200).json(result);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			const status = error.message.includes("não encontrado") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},

	async uploadCheckpointImage(req: Request, res: Response) {
		const checkpoint_id = Number(req.params.id);
		if (isNaN(checkpoint_id)) {
			res.status(400).json({ error: "ID inválido" });
			return;
		}
		if (!req.file) {
			res.status(400).json({ error: "Nenhuma imagem enviada" });
			return;
		}
		try {
			const result = await imageService.uploadCheckpointImage(checkpoint_id, req.file.buffer, req.file.mimetype);
			res.status(200).json(result);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			const status = error.message.includes("não encontrado") ? 404 : 500;
			res.status(status).json({ error: error.message });
		}
	},
};
