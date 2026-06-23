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
You are reading a treadmill LCD/LED display with 7-segment digit characters.

TASK: Extract exactly these 4 fields from the display:
- speed: current speed in km/h (typical range: 1.0 to 25.0, always a decimal like 2.5 or 10.0)
- distance: distance covered in km (typical range: 0.00 to 50.0, decimal)
- pace: pace per km in "MM:SS" format (typical range: 02:00 to 30:00)
- time: elapsed time in "HH:MM:SS" format (e.g. 00:05:23)

IMPORTANT RULES:
1. Read each 7-segment digit carefully. Common mistakes to AVOID:
   - Do NOT confuse 5 with 6, or 6 with 5
   - Do NOT confuse 1 with 7
   - Do NOT confuse 0 with 8
   - Do NOT confuse 9 with 8
2. Speed is usually the LARGEST or most prominent number on the display
3. Speed on a treadmill is ALWAYS between 0.5 and 25.0 km/h — if you read something outside this range, it is NOT speed
4. If a field is not visible or unreadable, return null
5. Respond ONLY with valid JSON, no markdown, no explanation:
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
