import { metricsRepository } from "../repositories/metricsRepository";

// Classifica o gênero livre do cadastro em "mulheres" ou "homens".
function classificarGenero(genero: string): "mulheres" | "homens" | null {
	const g = genero.trim().toLowerCase();
	if (g.startsWith("f")) return "mulheres";
	if (g.startsWith("m")) return "homens";
	return null;
}

// Formata pace em segundos por km como "mm:ss".
function formatarPace(secPerKm: number): string | null {
	if (!Number.isFinite(secPerKm) || secPerKm <= 0) return null;
	const total = Math.round(secPerKm);
	const minutos = Math.floor(total / 60);
	const segundos = total % 60;
	return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

// Rótulo do período de 6h vigente por tempo restante, ex.: "24h–18h restantes".
function rotuloPeriodo(idx: number): string {
	const i = Math.min(3, Math.max(0, Number(idx) || 0));
	const inicio = 24 - i * 6;
	const fim = 24 - (i + 1) * 6;
	return `${inicio}h–${fim}h restantes`;
}

export const metricsService = {
	async getTeamKm(eventId: number) {
		return metricsRepository.teamKmByEvent(eventId);
	},

	async getDashboard(eventId: number) {
		return metricsRepository.dashboardByEvent(eventId);
	},

	async getAthleteKm(eventId: number) {
		return metricsRepository.athleteKmByEvent(eventId);
	},

	async getAvgDistancePerShift(athleteId: number) {
		return metricsRepository.avgDistancePerShift(athleteId);
	},

	async getKmSnapshots(athleteId: number, eventId: number) {
		const buckets = await metricsRepository.kmSnapshots(athleteId, eventId);
		if (buckets.length === 0) return [];

		// Transform sparse buckets into cumulative totals
		const maxHour = buckets[buckets.length - 1].hour_bucket as number;
		const bucketMap = new Map<number, number>(
			buckets.map((b: any) => [Number(b.hour_bucket), Number(b.km_in_bucket)])
		);

		const snapshots: { hour: number; cumulative_km: number }[] = [];
		let cumulative = 0;
		for (let h = 0; h <= maxHour; h++) {
			cumulative += bucketMap.get(h) ?? 0;
			snapshots.push({ hour: h, cumulative_km: Math.round(cumulative * 100) / 100 });
		}
		return snapshots;
	},

	// Modo TV: total de km percorridos por mulheres x homens no evento.
	async getGenderKm(eventId: number) {
		const linhas = await metricsRepository.genderKmByEvent(eventId);
		const totais = { mulheres: 0, homens: 0 };
		for (const linha of linhas) {
			const grupo = classificarGenero(String(linha.gender ?? ""));
			if (grupo) totais[grupo] += Number(linha.total_km) || 0;
		}
		return {
			mulheres: Math.round(totais.mulheres * 100) / 100,
			homens: Math.round(totais.homens * 100) / 100,
		};
	},

	// Modo TV: pace médio do período de 6h vigente da competição.
	// Usa checkpoints quando há pares; senão recai no pace dos turnos do período
	// e, por fim, no pace de todo o evento.
	async getCompetitionPace(eventId: number) {
		const dados = await metricsRepository.pacePeriodByEvent(eventId);
		const idx = Number(dados?.period_idx) || 0;
		const candidato =
			dados?.checkpoint_sec_per_km ??
			dados?.shift_sec_per_km ??
			dados?.overall_sec_per_km;
		const secPerKm = candidato != null ? Number(candidato) : NaN;
		return {
			valor: formatarPace(secPerKm),
			periodo: rotuloPeriodo(idx),
			period_idx: idx,
		};
	},

	// Modo TV: resumo dinâmico (total coletivo, gênero e pace) atualizado a cada turno concluído.
	async getTvSummary(eventId: number) {
		const [genero, total, pace] = await Promise.all([
			this.getGenderKm(eventId),
			metricsRepository.totalKmByEvent(eventId),
			this.getCompetitionPace(eventId),
		]);
		return {
			total_km: Math.round((Number(total?.total_km) || 0) * 100) / 100,
			completed_shifts: Number(total?.completed_shifts) || 0,
			genero,
			pace,
		};
	},

	async getAthletePerformance(athleteId: number, eventId?: number) {
		const shifts = await metricsRepository.athletePerformance(athleteId, eventId);

		const totalDistance = shifts.reduce((acc: number, s: any) => acc + Number(s.distance ?? 0), 0);
		const totalTimeSeconds = shifts.reduce((acc: number, s: any) => {
			if (!s.total_time) return acc;
			// total_time is a PostgreSQL interval returned as { hours, minutes, seconds }
			const t = s.total_time;
			if (typeof t === "object" && t !== null && "hours" in t) {
				return acc + (t.hours ?? 0) * 3600 + (t.minutes ?? 0) * 60 + (t.seconds ?? 0);
			}
			return acc;
		}, 0);
		const avgSpeed =
			totalTimeSeconds > 0
				? Math.round((totalDistance / (totalTimeSeconds / 3600)) * 100) / 100
				: 0;

		return {
			summary: {
				total_distance: Math.round(totalDistance * 100) / 100,
				total_time_seconds: Math.round(totalTimeSeconds),
				avg_speed: avgSpeed,
				shift_count: shifts.length,
			},
			shifts,
		};
	},
};
