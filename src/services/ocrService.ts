import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TreadmillData {
	speed:    number | null; // km/h
	distance: number | null; // km
	pace:     string | null; // "MM:SS"
	time:     string | null; // "HH:MM:SS"
}

const PROMPT = `
You are reading a treadmill display (LCD, LED, OLED or any screen type).
The photo may be taken at an angle or tilted — compensate for perspective when reading digits.

TASK: Find and extract these 4 fields. Each value has a visible label on the display:
- speed: labeled "SPEED" or "KM/H" — decimal number like 2.5 or 10.0
- distance: labeled "DISTANCE" or "DIST" or "KM" — decimal number like 0.50
- pace: labeled "PACE" — format "MM:SS" like "05:30"
- time: labeled "TIME" or shown as the largest clock on screen — format "HH:MM:SS" like "00:03:37"

CRITICAL DIGIT READING RULES:
1. Always read digits LEFT TO RIGHT even if the display appears tilted or rotated in the photo
2. Speed on a treadmill is physically limited to 0.5–25.0 km/h. If you read something outside this range, you made a digit error — try again
3. Walking/jogging speed is usually 2–8 km/h. Running is 8–18 km/h. Above 20 km/h is rare
4. Do NOT confuse digit order: "2.5" is NOT the same as "5.2"
5. For time format HH:MM:SS — hours are almost always "00", minutes 00–59, seconds 00–59
6. If a label is not visible or value is unreadable, return null

Respond ONLY with valid JSON, no markdown, no explanation:
{"speed": <number or null>, "distance": <number or null>, "pace": "<string or null>", "time": "<string or null>"}
`.trim();

function parseOcr(raw: string): TreadmillData {
	const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
	const parsed = JSON.parse(clean) as TreadmillData;

	const speed    = typeof parsed.speed    === "number" ? parsed.speed    : null;
	const distance = typeof parsed.distance === "number" ? parsed.distance : null;
	const pace     = typeof parsed.pace     === "string" ? parsed.pace     : null;
	const time     = typeof parsed.time     === "string" ? parsed.time     : null;

	return {
		speed:    speed    != null && speed    >= 0.5  && speed    <= 25   ? speed    : null,
		distance: distance != null && distance >= 0    && distance <= 500  ? distance : null,
		pace:     pace     != null && /^\d{2}:\d{2}$/.test(pace)           ? pace     : null,
		time:     time     != null && /^\d{2}:\d{2}:\d{2}$/.test(time)    ? time     : null,
	};
}

const GEMINI_MODELS = ["gemini-2.5-flash"];

async function tryGemini(imageBuffer: Buffer, mimetype: string): Promise<TreadmillData> {
	const imagePart = { inlineData: { data: imageBuffer.toString("base64"), mimeType: mimetype } };

	for (const modelName of GEMINI_MODELS) {
		try {
			console.log(`[OCR] Tentando Gemini: ${modelName}`);
			const model = genAI.getGenerativeModel({ model: modelName });
			const result = await model.generateContent([PROMPT, imagePart]);
			const raw = result.response.text().trim();
			console.log(`[OCR] Gemini resposta: ${raw}`);
			return parseOcr(raw);
		} catch (err: any) {
			console.error(`[OCR] Gemini ${modelName} falhou:`, err?.message?.slice(0, 120));
			const isRetryable = err?.message?.includes("503") || err?.message?.includes("429") || err?.message?.includes("overloaded");
			if (!isRetryable || modelName === GEMINI_MODELS[GEMINI_MODELS.length - 1]) throw err;
		}
	}
	/* istanbul ignore next: inalcançável — o loop sempre retorna ou lança no último modelo */
	throw new Error("Todos os modelos Gemini falharam");
}

async function tryGroq(imageBuffer: Buffer, mimetype: string): Promise<TreadmillData> {
	if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada");

	const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
	const b64 = imageBuffer.toString("base64");

	console.log("[OCR] Tentando Groq: llama-4-scout-17b-16e-instruct");
	const completion = await groq.chat.completions.create({
		model: "meta-llama/llama-4-scout-17b-16e-instruct",
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: PROMPT },
					{ type: "image_url", image_url: { url: `data:${mimetype};base64,${b64}` } },
				],
			},
		],
		max_tokens: 150,
	});

	const raw = completion.choices[0]?.message?.content?.trim() ?? "";
	console.log(`[OCR] Groq resposta: ${raw}`);
	return parseOcr(raw);
}

export const ocrService = {
	async extractFromImage(imageBuffer: Buffer, mimetype: string): Promise<TreadmillData> {
		try {
			return await tryGemini(imageBuffer, mimetype);
		} catch (geminiErr: any) {
			console.warn("[OCR] Gemini indisponível, tentando Groq...");
			try {
				return await tryGroq(imageBuffer, mimetype);
			} catch (groqErr: any) {
				console.error("[OCR] Groq também falhou:", groqErr?.message?.slice(0, 120));
				throw new Error("OCR indisponível em todos os provedores");
			}
		}
	},
};
