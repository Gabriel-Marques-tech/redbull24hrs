import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TreadmillData {
	speed:    number | null; // km/h
	distance: number | null; // km
	pace:     string | null; // "MM:SS"
	time:     string | null; // "HH:MM:SS"
}

const PROMPT = `
Você está analisando a foto do display de uma esteira ergométrica.
Extraia exatamente os seguintes valores numéricos que aparecem no display:
- speed: velocidade em km/h (número decimal)
- distance: distância percorrida em km (número decimal)
- pace: ritmo no formato "MM:SS" por km
- time: tempo decorrido no formato "HH:MM:SS"

Responda SOMENTE com JSON válido, sem markdown, sem explicação:
{"speed": <número ou null>, "distance": <número ou null>, "pace": "<string ou null>", "time": "<string ou null>"}

Se um valor não estiver visível ou legível, use null.
`.trim();

export const ocrService = {
	async extractFromImage(imageBuffer: Buffer, mimetype: string): Promise<TreadmillData> {
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

		const imagePart = {
			inlineData: {
				data: imageBuffer.toString("base64"),
				mimeType: mimetype,
			},
		};

		const result = await model.generateContent([PROMPT, imagePart]);
		const text = result.response.text().trim();

		// Remove markdown code fences if present
		const clean = text.replace(/```json\n?|\n?```/g, "").trim();

		try {
			const parsed = JSON.parse(clean) as TreadmillData;
			return {
				speed:    typeof parsed.speed    === "number" ? parsed.speed    : null,
				distance: typeof parsed.distance === "number" ? parsed.distance : null,
				pace:     typeof parsed.pace     === "string" ? parsed.pace     : null,
				time:     typeof parsed.time     === "string" ? parsed.time     : null,
			};
		} catch {
			return { speed: null, distance: null, pace: null, time: null };
		}
	},
};
