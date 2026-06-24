import { eventRepository } from "../repositories/eventRepository";
import { treadmillRepository } from "../repositories/treadmillRepository";
import { removeFromStorage } from "../utils/supabaseStorage";

export const eventService = {
	async registerEvent(manager_id: number, title: string, local: string, date: string, image_url: string | null = null) {
		return eventRepository.createWithManager(title, local, date, manager_id, image_url ?? null);
	},

	async listEvents() {
		return eventRepository.findAll();
	},

	async getEvent(id: number) {
		const event = await eventRepository.findById(id);
		if (!event) throw new Error("Evento não encontrado");
		return event;
	},

	async updateEvent(id: number, fields: { title?: string; local?: string; date?: string; image_url?: string | null }) {
		const trocandoFoto = fields.image_url !== undefined;
		const atual = trocandoFoto ? await eventRepository.findById(id) : null;

		const event = await eventRepository.update(id, fields);
		if (!event) throw new Error("Evento não encontrado");

		if (trocandoFoto && atual?.image_url && atual.image_url !== fields.image_url) {
			await removeFromStorage(atual.image_url);
		}
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
