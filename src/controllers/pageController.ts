import { Response, Request } from "express";

const getLogin = async (req: Request, res: Response ): Promise<void> => {
	res.render('login')
}

const getHome = async (req: Request, res: Response ): Promise<void> => {
	res.render('home')
}
const redirectHome = async (req: Request, res: Response ): Promise<void> => {
	res.redirect('/home')
}

const getCompetition = async (req: Request, res: Response ): Promise<void> => {
	res.render('competition')
}

export default {getLogin, getHome, redirectHome, getCompetition}