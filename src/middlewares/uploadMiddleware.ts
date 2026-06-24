import multer from "multer";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_SIZE },
	fileFilter(_req, file, cb) {
		if (ALLOWED_MIME.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Tipo de arquivo inválido. Envie uma imagem (jpeg, png, webp, gif)."));
		}
	},
});
