import { eventRepository } from "../repositories/eventRepository";
import { teamRepository } from "../repositories/teamRepository";
import { athleteRepository } from "../repositories/athleteRepository";

export const teamService = {
	async registerTeam(event_id: number, name: string) {
		const event = await eventRepository.findById(event_id);
		if (!event) throw new Error("Evento não encontrado");
		return teamRepository.create(name, event_id);
	},

	async listTeams(event_id?: number) {
		return teamRepository.findAll(event_id);
	},

	async getTeam(id: number) {
		const team = await teamRepository.findById(id);
		if (!team) throw new Error("Equipe não encontrada");
		return team;
	},

	async updateTeam(id: number, name: string) {
		const team = await teamRepository.update(id, name);
		if (!team) throw new Error("Equipe não encontrada");
		return team;
	},

	async deleteTeam(id: number) {
		const team = await teamRepository.softDelete(id);
		if (!team) throw new Error("Equipe não encontrada");
		return team;
	},

	async registerAthlete(team_id: number, name: string, gender: string, cpf: string | null) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		return athleteRepository.create(name, gender, cpf ?? null, team_id);
	},

	async listAthletes(team_id: number) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		return athleteRepository.findByTeamId(team_id);
	},

	async getAthlete(team_id: number, id: number) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		const athlete = await athleteRepository.findById(id);
		if (!athlete) throw new Error("Atleta não encontrado");
		return athlete;
	},

	async updateAthlete(team_id: number, id: number, fields: { name?: string; gender?: string; cpf?: string | null }) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		const athlete = await athleteRepository.update(id, fields);
		if (!athlete) throw new Error("Atleta não encontrado");
		return athlete;
	},

	async deleteAthlete(team_id: number, id: number) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		const athlete = await athleteRepository.softDelete(id);
		if (!athlete) throw new Error("Atleta não encontrado");
		return athlete;
	},
};
