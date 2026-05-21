import { Response, Request } from "express";
import AuthService from "../services/authService";

const registerManager = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const status = await AuthService.registerManager(name, email, password);
  if (!status) {
    res.status(404).json({ error: "Impossivel cadastrar usuario" });
  } else {
    res.status(200).json(status);
  }
};

/*const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const status = await AuthService.loginUser(email, password);
  if (!status) {
    res.status(404).json({ error: "Usuario não encontrado" });
  } else {
    res.status(200).json(status);
  }
}; */

export default { registerManager /*loginUser*/ };
