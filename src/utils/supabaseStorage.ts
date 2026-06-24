import { randomUUID } from "crypto";

export async function uploadToStorage(
	buffer: Buffer,
	mimetype: string,
	originalName: string,
	bucket: string,
	folder?: string
): Promise<string> {
	const SUPABASE_URL = process.env.SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		throw new Error("Configuração do Supabase Storage ausente");
	}

	const ext = originalName.split(".").pop() ?? "bin";
	const objectPath = folder ? `${folder}/${randomUUID()}.${ext}` : `${randomUUID()}.${ext}`;
	const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;

	const response = await fetch(uploadUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
			"Content-Type": mimetype,
		},
		body: new Uint8Array(buffer),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Falha no upload de imagem: ${text}`);
	}

	return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
}

// Remove arquivo do bucket a partir da URL pública. Melhor esforço: nunca lança,
// evita derrubar o fluxo de update por falha de limpeza de imagem antiga.
export async function removeFromStorage(publicUrl: string | null | undefined): Promise<void> {
	if (!publicUrl) return;

	const SUPABASE_URL = process.env.SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;

	const marker = "/storage/v1/object/public/";
	const idx = publicUrl.indexOf(marker);
	if (idx === -1) return;

	const path = publicUrl.slice(idx + marker.length); // bucket/fileName
	const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${path}`;

	try {
		await fetch(deleteUrl, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
		});
	} catch {
		// silencia: imagem órfã no bucket é tolerável, falha de request não.
	}
}
