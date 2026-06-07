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

	async registerTreadmill(number: number) {
		return treadmillRepository.create(number);
	},

	async listTreadmills() {
		return treadmillRepository.findAll();
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
