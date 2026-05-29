import { alertsRepository } from "../repositories/alertsRepository";

export const alertsService = {
	async getAlerts(eventId: number) {
		const [treadmillRotation, checkpointGap] = await Promise.all([
			alertsRepository.treadmillsOverThreshold(eventId),
			alertsRepository.treadmillsWithoutRecentCheckpoint(eventId),
		]);
		return { treadmill_rotation: treadmillRotation, checkpoint_gap: checkpointGap };
	},
};
