import { metricsRepository } from "../repositories/metricsRepository";

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
