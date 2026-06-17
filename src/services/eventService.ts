import { eventRepository } from "../repositories/eventRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";

export const eventService = {
	async registerEvent(manager_id: number, title: string, local: string, date: string) {
		return eventRepository.createWithManager(title, local, date, manager_id);
	},

	async listEvents() {
		return eventRepository.findAll();
	},

	async getEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		return event;
	},

	async updateEvent(id: number, fields: { title?: string; local?: string; date?: string }) {
		const event = await eventRepository.update(id, fields);
		if (!event) throw new Error("Evento não encontrado");
		return event;
	},

	async deleteEvent(id: number) {
		const event = await eventRepository.softDelete(id);
		if (!event) throw new Error("Evento não encontrado");
		return event;
	},

	async startEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		if (event.status === "in_progress") throw new Error("Evento já está em andamento");
		if (event.status === "finished") throw new Error("Evento já está encerrado");
		const started = await eventRepository.start(id);
		if (!started) throw new Error("Não foi possível iniciar o evento");
		return started;
	},

	async pauseEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		if (event.status !== "in_progress") throw new Error("Evento não está em andamento");
		if (event.paused_at) throw new Error("Evento já está pausado");
		const paused = await eventRepository.pause(id);
		if (!paused) throw new Error("Não foi possível pausar o evento");
		return paused;
	},

	async resumeEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		if (event.status !== "in_progress") throw new Error("Evento não está em andamento");
		if (!event.paused_at) throw new Error("Evento não está pausado");
		const resumed = await eventRepository.resume(id);
		if (!resumed) throw new Error("Não foi possível retomar o evento");
		return resumed;
	},

	async finishEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		if (event.status === "pending") throw new Error("Evento ainda não foi iniciado");
		if (event.status === "finished") throw new Error("Evento já está encerrado");
		const finished = await eventRepository.finish(id);
		if (!finished) throw new Error("Não foi possível encerrar o evento");
		return finished;
	},

	async registerTreadmill(number: number) {
		return treadmillRepository.create(number);
	},

	async listTreadmills() {
		return treadmillRepository.findAll();
	},

	async listTreadmillsByTeam(team_id: number) {
		return treadmillRepository.findByTeam(team_id);
	},

	async updateTreadmill(id: number, number: number) {
		const treadmill = await treadmillRepository.update(id, number);
		if (!treadmill) throw new Error("Esteira não encontrada");
		return treadmill;
	},

	async deleteTreadmill(id: number) {
		const treadmill = await treadmillRepository.hardDelete(id);
		if (!treadmill) throw new Error("Esteira não encontrada");
		return treadmill;
	},
};
