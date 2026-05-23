import { eventRepository, teamRepository, athleteRepository, treadmillRepository } from "../repositories/entityRepositories";

export const registryService = {
	async registerEvent(manager_id: number, title: string, local: string, date: string) {
		return eventRepository.createWithManager(title, local, date, manager_id);
	},

	async registerTeam(event_id: number, name: string) {
		const event = await eventRepository.findById(event_id);
		if (!event) throw new Error("Evento não encontrado");

		return teamRepository.create(name, event_id);
	},

	async registerAthlete(team_id: number, name: string, gender: string, cpf: string | null) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");

		return athleteRepository.create(name, gender, cpf ?? null, team_id);
	},

	async registerTreadmill(number: number) {
		return treadmillRepository.create(number);
	},

	async listEvents() {
		return eventRepository.findAll();
	},

	async listTeams(event_id: number) {
		const event = await eventRepository.findById(event_id);
		if (!event) throw new Error("Evento não encontrado");
		return teamRepository.findByEventId(event_id);
	},

	async listAthletes(team_id: number) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		return athleteRepository.findByTeamId(team_id);
	},

	async listTreadmills() {
		return treadmillRepository.findAll();
	},
};
