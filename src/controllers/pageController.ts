import { Response, Request } from "express";
import { eventService } from "../services/eventService"
import { teamService } from "../services/teamService"
import { treadmillRepository } from "../repositories/treadmillRepository"
import { shiftRepository } from "../repositories/shiftRepository"
import { historyRepository } from "../repositories/historyRepository"
import { metricsRepository } from "../repositories/metricsRepository"
import { eventRepository } from "../repositories/eventRepository"

const getLogin = async (req: Request, res: Response ): Promise<void> => {
	res.render('login')
}

const getHome = async (req: Request, res: Response ): Promise<void> => {
	const events = await eventService.listEvents()
	res.render('home', { events, user: req.user })
}

const redirectHome = async (req: Request, res: Response ): Promise<void> => {
	res.redirect('/home')
}

const getCompetition = async (req: Request, res: Response ): Promise<void> => {
	// Auditor só audita competições em andamento (abertas para alteração de dados)
	const events = (await eventService.listEvents()).filter((e: any) => e.status === 'in_progress')
	res.render('competition', { events })
}

const getTeam = async (req: Request, res: Response): Promise<void> => {
	const eventId = Number(req.query.eventId)
	if (!eventId) { res.redirect('/competition'); return }

	const teams = await teamService.listTeams(eventId)

	const teamsWithAthletes = await Promise.all(
		teams.map(async (team: any) => ({
			...team,
			athletes: await teamService.listAthletes(team.id)
		}))
	)

	res.render('teams', { teams: teamsWithAthletes, eventId })
}

const getTreadmill = async (req: Request, res: Response): Promise<void> => {
	const eventId = Number(req.query.eventId)
	const teamId = Number(req.query.teamId)
	if (!eventId || !teamId) { res.redirect('/competition'); return }

	const [treadmills, busyIds] = await Promise.all([
		eventService.listTreadmillsByTeam(teamId),
		treadmillRepository.findBusyIds(),
	])
	res.render('treadmill', { treadmills, busyIds, eventId, teamId })
}

const getOverview = async (req: Request, res: Response): Promise<void> => {
	const eventId    = Number(req.query.eventId)
	const teamId     = Number(req.query.teamId)
	const treadmillId = Number(req.query.treadmillId)
	if (!eventId || !teamId || !treadmillId) { res.redirect('/competition'); return }

	const [event, team, treadmill] = await Promise.all([
		eventService.getEvent(eventId),
		teamService.getTeam(teamId),
		treadmillRepository.findById(treadmillId),
	])

	res.render('overview', { event, team, treadmill, eventId, teamId, treadmillId })
}

const getAudit = async (req: Request, res: Response): Promise<void> => {
	const eventId     = Number(req.query.eventId)
	const teamId      = Number(req.query.teamId)
	const treadmillId = Number(req.query.treadmillId)
	if (!eventId || !teamId || !treadmillId) { res.redirect('/competition'); return }

	const [team, treadmill, treadmills, busyIds, athletes, openShift, historyEntries] = await Promise.all([
		teamService.getTeam(teamId),
		treadmillRepository.findById(treadmillId),
		eventService.listTreadmillsByTeam(teamId),
		treadmillRepository.findBusyIds(),
		teamService.listAthletes(teamId),
		shiftRepository.findOpenByTreadmill(treadmillId),
		historyRepository.findByEvent({ event_id: eventId, team_id: teamId }),
	])

	res.render('audit', {
		team,
		treadmill,
		treadmills,
		busyIds,
		athletes,
		auditor: req.user,
		eventId,
		teamId,
		treadmillId,
		openShift: openShift ?? null,
		historyEntries,
	})
}

const getManagerShifts = async (req: Request, res: Response): Promise<void> => {
	const openShifts = await shiftRepository.findAllOpen()
	res.render('manager-shifts', { openShifts, auditor: req.user })
}

const getCreateEventLocation = async (req: Request, res: Response): Promise<void> => {
	res.render('gerente-localidade', { manager_id: req.user?.id ?? 0 })
}

const getCreateEventImage = async (req: Request, res: Response): Promise<void> => {
	res.render('gerente-imagem-evento', { manager_id: req.user?.id ?? 0 })
}

const getCreateEventSchedule = async (req: Request, res: Response): Promise<void> => {
	res.render('gerente-data-horario', { manager_id: req.user?.id ?? 0 })
}

const getCreateEventTeams = async (req: Request, res: Response): Promise<void> => {
	const passo = Number(req.query.passo) || 1
	res.render('gerente-equipes', { manager_id: req.user?.id ?? 0, passo_inicial: passo })
}

const getCreateEventAthlete = async (req: Request, res: Response): Promise<void> => {
	res.render('informacoes-atleta', { manager_id: req.user?.id ?? 0 })
}

const getEventOverview = async (req: Request, res: Response): Promise<void> => {
	const id = Number(req.params.id)
	if (!id) { res.redirect('/home'); return }
	let evento: any
	try { evento = await eventService.getEvent(id) } catch { res.redirect('/home'); return }

	const user_role = req.user?.role ?? 'auditor'

	if (evento.status === 'pending') {
		// auditor não tem o que fazer em evento agendado — avisa que é exclusivo de manager
		if (user_role !== 'manager') { res.redirect('/home?aviso=agendada_manager'); return }
		const teams = await teamService.listTeams(id)
		const equipes = []
		for (const team of teams) {
			const atletas = await teamService.listAthletes(team.id)
			equipes.push({ ...team, atletas })
		}
		res.render('visao-evento', { manager_id: req.user?.id ?? 0, user_role, evento, equipes })
		return
	}

	// in_progress | finished → estatísticas
	const [teamStats, athleteStats, historyEntries, dashboardStats, pauseInfo] = await Promise.all([
		metricsRepository.teamStatsByEvent(id),
		metricsRepository.athleteStatsByEvent(id),
		historyRepository.findByEvent({ event_id: id }),
		metricsRepository.dashboardStats(id),
		eventRepository.pausesByEvent(id),
	])
	res.render('estatisticas-evento', { manager_id: req.user?.id ?? 0, user_role, evento, teamStats, athleteStats, historyEntries, dashboardStats, pauseInfo })
}

const getEditEvent = async (req: Request, res: Response): Promise<void> => {
	const id = Number(req.params.id)
	if (!id) { res.redirect('/home'); return }

	let evento: any
	try {
		evento = await eventService.getEvent(id)
	} catch {
		res.redirect('/home'); return
	}

	// Só competições agendadas podem ser editadas
	if (evento.status !== 'pending') {
		res.redirect('/home'); return
	}

	const teams = await teamService.listTeams(id)
	const equipes = []
	for (const team of teams) {
		const atletas = await teamService.listAthletes(team.id)
		equipes.push({ ...team, atletas })
	}

	res.render('editar-competicao', { manager_id: req.user?.id ?? 0, evento, equipes })
}

const getShareManager = async (req: Request, res: Response): Promise<void> => {
	const id = Number(req.params.id)
	if (!id) { res.redirect('/home'); return }

	let evento: any
	try {
		evento = await eventService.getEvent(id)
	} catch {
		res.redirect('/home'); return
	}

	res.render('share-manager', { event: evento, user: req.user })
}

export default {getLogin, getHome, redirectHome, getCompetition, getTeam, getTreadmill, getOverview, getAudit, getManagerShifts, getCreateEventLocation, getCreateEventImage, getCreateEventSchedule, getCreateEventTeams, getCreateEventAthlete, getEventOverview, getEditEvent, getShareManager}
