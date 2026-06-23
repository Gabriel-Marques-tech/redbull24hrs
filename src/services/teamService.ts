import { eventRepository } from "../repositories/eventRepository";
import { teamRepository } from "../repositories/teamRepository";
import { athleteRepository } from "../repositories/athleteRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";

export const teamService = {
	async registerTeam(event_id: number, name: string) {
		const event = await eventRepository.findById(event_id);
		if (!event) throw new Error("Evento não encontrado");

		// Count existing teams to determine treadmill numbers
		const existingTeams = await teamRepository.findAll(event_id);
		const teamIndex = existingTeams.length; // 0 = first team, 1 = second team

		const team = await teamRepository.create(name, event_id);

		// Auto-assign 2 treadmills: team #1 → [1,2], team #2 → [3,4]
		const baseNumber = teamIndex * 2 + 1;
		await treadmillRepository.create(baseNumber, team.id);
		await treadmillRepository.create(baseNumber + 1, team.id);

		return team;
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

	async registerAthlete(team_id: number, name: string, gender: string, cpf: string | null, email?: string | null) {
		const team = await teamRepository.findById(team_id);
		if (!team) throw new Error("Equipe não encontrada");
		return athleteRepository.create(name, gender, cpf ?? null, team_id, email ?? null);
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

	async updateAthlete(team_id: number, id: number, fields: { name?: string; gender?: string; cpf?: string | null; email?: string | null }) {
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
