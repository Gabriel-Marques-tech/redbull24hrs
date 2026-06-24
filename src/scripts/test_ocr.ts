import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ocrService } from "../services/ocrService";

const imgPath = process.argv[2];

if (!imgPath) {
	console.error("Uso: npx ts-node src/scripts/test_ocr.ts <caminho_imagem>");
	process.exit(1);
}

const abs = path.resolve(imgPath);
if (!fs.existsSync(abs)) {
	console.error(`Arquivo não encontrado: ${abs}`);
	process.exit(1);
}

const ext = path.extname(abs).toLowerCase();
const mimeMap: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
};
const mimetype = mimeMap[ext] ?? "image/jpeg";

console.log(`Imagem: ${abs}`);
console.log(`Tipo:   ${mimetype}`);
console.log("Chamando Gemini Vision...\n");

ocrService
	.extractFromImage(fs.readFileSync(abs), mimetype)
	.then((result) => {
		console.log("Resultado OCR:");
		console.log(JSON.stringify(result, null, 2));
	})
	.catch((err) => {
		console.error("Erro:", err.message);
		process.exit(1);
	});
