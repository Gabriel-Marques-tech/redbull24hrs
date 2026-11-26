import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";

// Armazenamento de imagens em disco, com as mesmas rotas do Supabase Storage.
// Ativado quando LOCAL_STORAGE_DIR está definido; basta apontar SUPABASE_URL para a
// URL pública do próprio sistema e nenhum outro código de upload precisa mudar.
// Serve para rodar sem um projeto Supabase (POC em uma única máquina).

const PREFIX = "/storage/v1/object";

const MIME_BY_EXT: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	gif: "image/gif",
	heic: "image/heic",
	heif: "image/heif",
	svg: "image/svg+xml",
};

function baseDir(): string | null {
	const dir = process.env.LOCAL_STORAGE_DIR;
	return dir ? path.resolve(dir) : null;
}

// Converte "bucket/pasta/arquivo.ext" em caminho absoluto, recusando qualquer
// tentativa de sair da pasta base ("..", caminho absoluto, byte nulo).
function resolveInside(base: string, relative: string): string | null {
	let decoded: string;
	try {
		decoded = decodeURIComponent(relative);
	} catch {
		return null;
	}
	if (!decoded || decoded.includes("\0")) return null;
	const target = path.resolve(base, decoded.replace(/^\/+/, ""));
	if (target !== base && !target.startsWith(base + path.sep)) return null;
	if (target === base) return null;
	return target;
}

function isAuthorized(req: Request): boolean {
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) return false;
	return req.headers.authorization === `Bearer ${key}`;
}

export function createLocalStorageRouter(): Router {
	const router = express.Router();

	// Leitura pública: /storage/v1/object/public/<bucket>/<caminho>
	router.get(/^\/public\/(.+)$/, (req: Request, res: Response) => {
		const base = baseDir();
		const file = base ? resolveInside(base, String(req.params[0])) : null;
		if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
			res.status(404).json({ error: "Arquivo não encontrado" });
			return;
		}
		const ext = path.extname(file).slice(1).toLowerCase();
		res.setHeader("Content-Type", MIME_BY_EXT[ext] ?? "application/octet-stream");
		res.setHeader("Cache-Control", "public, max-age=86400");
		res.setHeader("X-Content-Type-Options", "nosniff");
		fs.createReadStream(file).pipe(res);
	});

	// Gravação: POST ou PUT /storage/v1/object/<bucket>/<caminho>, corpo = bytes da imagem
	const write = (req: Request, res: Response) => {
		if (!isAuthorized(req)) {
			res.status(401).json({ error: "Não autorizado" });
			return;
		}
		const base = baseDir();
		const relative = String(req.params[0]);
		const file = base ? resolveInside(base, relative) : null;
		if (!file) {
			res.status(400).json({ error: "Caminho inválido" });
			return;
		}
		if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
			res.status(400).json({ error: "Arquivo vazio" });
			return;
		}
		try {
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, req.body);
			res.status(200).json({ Key: relative, Id: relative });
		} catch (error: any) {
			console.error(`[STORAGE] Falha ao gravar ${relative}:`, error?.message ?? error);
			res.status(500).json({ error: "Falha ao gravar arquivo" });
		}
	};
	const rawBody = express.raw({ type: () => true, limit: "25mb" });
	router.post(/^\/(?!public\/)(.+)$/, rawBody, write);
	router.put(/^\/(?!public\/)(.+)$/, rawBody, write);

	// Remoção: DELETE /storage/v1/object/<bucket>/<caminho>
	router.delete(/^\/(?!public\/)(.+)$/, (req: Request, res: Response) => {
		if (!isAuthorized(req)) {
			res.status(401).json({ error: "Não autorizado" });
			return;
		}
		const base = baseDir();
		const file = base ? resolveInside(base, String(req.params[0])) : null;
		if (file && fs.existsSync(file)) {
			try {
				fs.unlinkSync(file);
			} catch (error: any) {
				console.error("[STORAGE] Falha ao remover arquivo:", error?.message ?? error);
			}
		}
		res.status(200).json({ message: "ok" });
	});

	return router;
}

export const LOCAL_STORAGE_PREFIX = PREFIX;
