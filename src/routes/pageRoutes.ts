import express, {Router} from 'express'
import pageController from '../controllers/pageController'
import authMiddleware from '../middlewares/authMiddleware'

const router = express.Router()

router.get('/login', pageController.getLogin)
router.get('/home', authMiddleware.requirePageAuth, pageController.getHome)
router.get('', pageController.redirectHome)
router.get('/competition', authMiddleware.requirePageAuth, pageController.getCompetition)



export default router