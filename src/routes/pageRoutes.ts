import express, {Router} from 'express'
import pageController from '../controllers/pageController'
import authMiddleware from '../middlewares/authMiddleware'

const router = express.Router()

router.get('/login', pageController.getLogin)
router.get('/home', authMiddleware.requirePageAuth, pageController.getHome)
router.get('', pageController.redirectHome)
router.get('/competition', authMiddleware.requirePageAuth, pageController.getCompetition)
router.get('/team', authMiddleware.requirePageAuth, pageController.getTeam)
router.get('/treadmill', authMiddleware.requirePageAuth, pageController.getTreadmill)
router.get('/overview', authMiddleware.requirePageAuth, pageController.getOverview)
router.get('/audit', authMiddleware.requirePageAuth, pageController.getAudit)
router.get('/manager/shifts', authMiddleware.requirePageAuth, pageController.getManagerShifts)

// Wizard de criação de evento/equipes — apenas manager
router.get('/manager/create-event/location', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager'), pageController.getCreateEventLocation)
router.get('/manager/create-event/schedule', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager'), pageController.getCreateEventSchedule)
router.get('/manager/create-event/teams', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager'), pageController.getCreateEventTeams)
router.get('/manager/create-event/athlete', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager'), pageController.getCreateEventAthlete)

// Overview de competição (todos os status) — manager e auditor
router.get('/manager/event/:id', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager', 'auditor'), pageController.getEventOverview)
// Edição de competição agendada — apenas manager
router.get('/manager/event/:id/edit', authMiddleware.requirePageAuth, authMiddleware.requireRole('manager'), pageController.getEditEvent)

export default router