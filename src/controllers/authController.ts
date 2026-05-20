import { Response, Request } from "express";
import AuthService from "../services/authService";

const registerUser = async (req: Request, res: Response): Promise<void> => {
	const { name, email, password } = req.body;
	const status = await AuthService.registerUser(name, email, password);
	if (!status) {
		res.status(404).json({ error: "Impossivel cadastrar usuario" });
	} else {
		res.status(200).json(status);
	}
};

export default { registerUser };
