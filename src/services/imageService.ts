import { supabase } from "./supabaseClient";
import { imageRepository } from "../repositories/imageRepository";
import { ocrService } from "./ocrService";

const BUCKET = "photos";

async function uploadToStorage(buffer: Buffer, mimetype: string, folder: string, id: number): Promise<string> {
	const ext = mimetype.split("/")[1];
	const path = `${folder}/${id}/${Date.now()}.${ext}`;

	const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
		contentType: mimetype,
		upsert: true,
	});

	if (error) throw new Error(`Erro no upload: ${error.message}`);

	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}

export const imageService = {
	async uploadShiftImage(shift_id: number, buffer: Buffer, mimetype: string) {
		const exists = await imageRepository.shiftExists(shift_id);
		if (!exists) throw new Error("Turno não encontrado");

		const [url, ocr] = await Promise.all([
			uploadToStorage(buffer, mimetype, "shifts", shift_id),
			ocrService.extractFromImage(buffer, mimetype).catch(() => null),
		]);

		const shift = await imageRepository.setShiftImage(shift_id, url);
		if (ocr) await imageRepository.setShiftOcr(shift_id, ocr);

		return { image_url: shift.image_url, ocr };
	},

	async uploadCheckpointImage(checkpoint_id: number, buffer: Buffer, mimetype: string) {
		const exists = await imageRepository.checkpointExists(checkpoint_id);
		if (!exists) throw new Error("Checkpoint não encontrado");

		const [url, ocr] = await Promise.all([
			uploadToStorage(buffer, mimetype, "checkpoints", checkpoint_id),
			ocrService.extractFromImage(buffer, mimetype).catch(() => null),
		]);

		const checkpoint = await imageRepository.setCheckpointImage(checkpoint_id, url);
		if (ocr) await imageRepository.setCheckpointOcr(checkpoint_id, ocr);

		return { image_url: checkpoint.image_url, ocr };
	},
};
