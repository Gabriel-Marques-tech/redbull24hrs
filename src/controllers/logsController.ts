import { Request, Response } from "express";
import { logsService } from "../services/logsService";

function parseIntParam(value: unknown, name: string): number | null {
	if (value == null) return null;
	const n = Number(value);
	if (!Number.isInteger(n)) throw new Error(`${name} inválido: deve ser um número inteiro`);
	return n;
}

export const logsController = {
	async getLogs(req: Request, res: Response) {
		try {
			const shift_id = parseIntParam(req.query.shift_id, "shift_id");
			const checkpoint_id = parseIntParam(req.query.checkpoint_id, "checkpoint_id");
			const author_id = parseIntParam(req.query.author_id, "author_id");
			const type = (req.query.type as string) ?? null;

			const logs = await logsService.getLogs({ shift_id, checkpoint_id, type, author_id });
			res.status(200).json(logs);
		} catch (error: any) {
		console.error(`[ERROR] ${error?.message ?? error}`, error?.stack ?? "");
			const status = error.message.includes("inválid") ? 400 : 500;
			res.status(status).json({ error: error.message });
		}
	},
};
