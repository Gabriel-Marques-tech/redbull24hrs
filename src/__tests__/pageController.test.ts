import { Request, Response } from "express";

jest.mock("../services/eventService", () => ({
	eventService: {
		listEvents: jest.fn(),
		getEvent: jest.fn(),
		listTreadmillsByTeam: jest.fn(),
	},
}));

jest.mock("../services/teamService", () => ({
	teamService: {
		listTeams: jest.fn(),
		listAthletes: jest.fn(),
		getTeam: jest.fn(),
	},
}));

jest.mock("../repositories/treadmillRepository", () => ({
	treadmillRepository: {
		findBusyIds: jest.fn(),
		findById: jest.fn(),
	},
}));

jest.mock("../repositories/shiftRepository", () => ({
	shiftRepository: {
		findOpenByTreadmill: jest.fn(),
		findAllOpen: jest.fn(),
	},
}));

jest.mock("../repositories/historyRepository", () => ({
	historyRepository: { findByEvent: jest.fn() },
}));

jest.mock("../repositories/metricsRepository", () => ({
	metricsRepository: {
		teamStatsByEvent: jest.fn(),
		athleteStatsByEvent: jest.fn(),
		dashboardStats: jest.fn(),
	},
}));

import pageController from "../controllers/pageController";
import { eventService } from "../services/eventService";
import { teamService } from "../services/teamService";
import { treadmillRepository } from "../repositories/treadmillRepository";
import { shiftRepository } from "../repositories/shiftRepository";
import { historyRepository } from "../repositories/historyRepository";
import { metricsRepository } from "../repositories/metricsRepository";

const buildRes = () => {
	const res = {} as Response;
	res.render = jest.fn().mockReturnValue(res);
	res.redirect = jest.fn().mockReturnValue(res);
	return res;
};

const buildReq = (over: Record<string, any> = {}): Request =>
	({ query: {}, params: {}, user: { id: "1", role: "manager", email: "m@t.com", name: "M" }, ...over } as unknown as Request);

beforeEach(() => jest.clearAllMocks());

// ─── Páginas simples ──────────────────────────────────────────────────────────

describe("getLogin", () => {
	it("renderiza a view de login", async () => {
		const res = buildRes();
		await pageController.getLogin(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("login");
	});
});

describe("redirectHome", () => {
	it("redireciona para /home", async () => {
		const res = buildRes();
		await pageController.redirectHome(buildReq(), res);
		expect(res.redirect).toHaveBeenCalledWith("/home");
	});
});

describe("getHome", () => {
	it("renderiza home com eventos e usuário", async () => {
		(eventService.listEvents as jest.Mock).mockResolvedValue([{ id: 1 }]);
		const res = buildRes();
		await pageController.getHome(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("home", { events: [{ id: 1 }], user: expect.any(Object) });
	});
});

describe("getCompetition", () => {
	it("renderiza apenas eventos em andamento", async () => {
		(eventService.listEvents as jest.Mock).mockResolvedValue([
			{ id: 1, status: "in_progress" },
			{ id: 2, status: "pending" },
		]);
		const res = buildRes();
		await pageController.getCompetition(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("competition", { events: [{ id: 1, status: "in_progress" }] });
	});
});

// ─── getTeam ──────────────────────────────────────────────────────────────────

describe("getTeam", () => {
	it("redireciona para /competition sem eventId", async () => {
		const res = buildRes();
		await pageController.getTeam(buildReq({ query: {} }), res);
		expect(res.redirect).toHaveBeenCalledWith("/competition");
	});

	it("renderiza teams com atletas agregados", async () => {
		(teamService.listTeams as jest.Mock).mockResolvedValue([{ id: 1, name: "Alpha" }]);
		(teamService.listAthletes as jest.Mock).mockResolvedValue([{ id: 9 }]);
		const res = buildRes();
		await pageController.getTeam(buildReq({ query: { eventId: "5" } }), res);
		expect(res.render).toHaveBeenCalledWith("teams", {
			teams: [{ id: 1, name: "Alpha", athletes: [{ id: 9 }] }],
			eventId: 5,
		});
	});
});

// ─── getTreadmill ─────────────────────────────────────────────────────────────

describe("getTreadmill", () => {
	it("redireciona sem eventId/teamId", async () => {
		const res = buildRes();
		await pageController.getTreadmill(buildReq({ query: { eventId: "5" } }), res);
		expect(res.redirect).toHaveBeenCalledWith("/competition");
	});

	it("renderiza treadmill com esteiras e ocupadas", async () => {
		(eventService.listTreadmillsByTeam as jest.Mock).mockResolvedValue([{ id: 2 }]);
		(treadmillRepository.findBusyIds as jest.Mock).mockResolvedValue([3]);
		const res = buildRes();
		await pageController.getTreadmill(buildReq({ query: { eventId: "5", teamId: "1" } }), res);
		expect(res.render).toHaveBeenCalledWith("treadmill", { treadmills: [{ id: 2 }], busyIds: [3], eventId: 5, teamId: 1 });
	});
});

// ─── getOverview ──────────────────────────────────────────────────────────────

describe("getOverview", () => {
	it("redireciona sem todos os parâmetros", async () => {
		const res = buildRes();
		await pageController.getOverview(buildReq({ query: { eventId: "5", teamId: "1" } }), res);
		expect(res.redirect).toHaveBeenCalledWith("/competition");
	});

	it("renderiza overview com evento, equipe e esteira", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 5 });
		(teamService.getTeam as jest.Mock).mockResolvedValue({ id: 1 });
		(treadmillRepository.findById as jest.Mock).mockResolvedValue({ id: 2 });
		const res = buildRes();
		await pageController.getOverview(buildReq({ query: { eventId: "5", teamId: "1", treadmillId: "2" } }), res);
		expect(res.render).toHaveBeenCalledWith("overview", expect.objectContaining({ eventId: 5, teamId: 1, treadmillId: 2 }));
	});
});

// ─── getAudit ─────────────────────────────────────────────────────────────────

describe("getAudit", () => {
	it("redireciona sem todos os parâmetros", async () => {
		const res = buildRes();
		await pageController.getAudit(buildReq({ query: {} }), res);
		expect(res.redirect).toHaveBeenCalledWith("/competition");
	});

	it("renderiza audit com dados do turno", async () => {
		(teamService.getTeam as jest.Mock).mockResolvedValue({ id: 1 });
		(treadmillRepository.findById as jest.Mock).mockResolvedValue({ id: 2 });
		(eventService.listTreadmillsByTeam as jest.Mock).mockResolvedValue([{ id: 2 }]);
		(treadmillRepository.findBusyIds as jest.Mock).mockResolvedValue([]);
		(teamService.listAthletes as jest.Mock).mockResolvedValue([{ id: 9 }]);
		(shiftRepository.findOpenByTreadmill as jest.Mock).mockResolvedValue(null);
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue([]);
		const res = buildRes();
		await pageController.getAudit(buildReq({ query: { eventId: "5", teamId: "1", treadmillId: "2" } }), res);
		expect(res.render).toHaveBeenCalledWith("audit", expect.objectContaining({ openShift: null, eventId: 5 }));
	});
});

// ─── getManagerShifts ─────────────────────────────────────────────────────────

describe("getManagerShifts", () => {
	it("renderiza manager-shifts com turnos abertos", async () => {
		(shiftRepository.findAllOpen as jest.Mock).mockResolvedValue([{ id: 10 }]);
		const res = buildRes();
		await pageController.getManagerShifts(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("manager-shifts", { openShifts: [{ id: 10 }], auditor: expect.any(Object) });
	});
});

// ─── Wizard de criação de evento ──────────────────────────────────────────────

describe("wizard de criação de evento", () => {
	it("getCreateEventLocation renderiza gerente-localidade", async () => {
		const res = buildRes();
		await pageController.getCreateEventLocation(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("gerente-localidade", { manager_id: "1" });
	});

	it("getCreateEventSchedule renderiza gerente-data-horario", async () => {
		const res = buildRes();
		await pageController.getCreateEventSchedule(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("gerente-data-horario", { manager_id: "1" });
	});

	it("getCreateEventTeams usa passo da query", async () => {
		const res = buildRes();
		await pageController.getCreateEventTeams(buildReq({ query: { passo: "2" } }), res);
		expect(res.render).toHaveBeenCalledWith("gerente-equipes", { manager_id: "1", passo_inicial: 2 });
	});

	it("getCreateEventAthlete renderiza informacoes-atleta", async () => {
		const res = buildRes();
		await pageController.getCreateEventAthlete(buildReq(), res);
		expect(res.render).toHaveBeenCalledWith("informacoes-atleta", { manager_id: "1" });
	});
});

// ─── getEventOverview ─────────────────────────────────────────────────────────

describe("getEventOverview", () => {
	it("redireciona para /home quando evento não existe", async () => {
		(eventService.getEvent as jest.Mock).mockRejectedValue(new Error("Evento não encontrado"));
		const res = buildRes();
		await pageController.getEventOverview(buildReq({ params: { id: "1" } }), res);
		expect(res.redirect).toHaveBeenCalledWith("/home");
	});

	it("evento pendente + auditor → redireciona com aviso", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 1, status: "pending" });
		const res = buildRes();
		await pageController.getEventOverview(
			buildReq({ params: { id: "1" }, user: { id: "2", role: "auditor" } }),
			res
		);
		expect(res.redirect).toHaveBeenCalledWith("/home?aviso=agendada_manager");
	});

	it("evento pendente + manager → renderiza visao-evento", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 1, status: "pending" });
		(teamService.listTeams as jest.Mock).mockResolvedValue([{ id: 1 }]);
		(teamService.listAthletes as jest.Mock).mockResolvedValue([]);
		const res = buildRes();
		await pageController.getEventOverview(buildReq({ params: { id: "1" } }), res);
		expect(res.render).toHaveBeenCalledWith("visao-evento", expect.objectContaining({ evento: { id: 1, status: "pending" } }));
	});

	it("evento em andamento → renderiza estatisticas-evento", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 1, status: "in_progress" });
		(metricsRepository.teamStatsByEvent as jest.Mock).mockResolvedValue([]);
		(metricsRepository.athleteStatsByEvent as jest.Mock).mockResolvedValue([]);
		(historyRepository.findByEvent as jest.Mock).mockResolvedValue([]);
		(metricsRepository.dashboardStats as jest.Mock).mockResolvedValue({});
		const res = buildRes();
		await pageController.getEventOverview(buildReq({ params: { id: "1" } }), res);
		expect(res.render).toHaveBeenCalledWith("estatisticas-evento", expect.objectContaining({ evento: { id: 1, status: "in_progress" } }));
	});
});

// ─── getEditEvent ─────────────────────────────────────────────────────────────

describe("getEditEvent", () => {
	it("redireciona para /home quando evento não existe", async () => {
		(eventService.getEvent as jest.Mock).mockRejectedValue(new Error("Evento não encontrado"));
		const res = buildRes();
		await pageController.getEditEvent(buildReq({ params: { id: "1" } }), res);
		expect(res.redirect).toHaveBeenCalledWith("/home");
	});

	it("redireciona quando evento não está pendente", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 1, status: "in_progress" });
		const res = buildRes();
		await pageController.getEditEvent(buildReq({ params: { id: "1" } }), res);
		expect(res.redirect).toHaveBeenCalledWith("/home");
	});

	it("renderiza editar-competicao para evento pendente", async () => {
		(eventService.getEvent as jest.Mock).mockResolvedValue({ id: 1, status: "pending" });
		(teamService.listTeams as jest.Mock).mockResolvedValue([{ id: 1 }]);
		(teamService.listAthletes as jest.Mock).mockResolvedValue([]);
		const res = buildRes();
		await pageController.getEditEvent(buildReq({ params: { id: "1" } }), res);
		expect(res.render).toHaveBeenCalledWith("editar-competicao", expect.objectContaining({ evento: { id: 1, status: "pending" } }));
	});
});
