import { Request, Response } from "express";
import AuthService from "../services/authService";
import { UserRole } from "../types/user.types";

const registerManager = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const manager = await AuthService.registerManager(name, email, password);
  if (!manager) {
    res.status(400).json({ error: "Dados inválidos para cadastro de gerente" });
    return;
  }
  res.status(201).json(manager);
};

const registerAuditor = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, registration_number } = req.body;
  const auditor = await AuthService.registerAuditor(
    name,
    email,
    password,
    registration_number,
  );
  if (!auditor) {
    res.status(400).json({ error: "Dados inválidos para cadastro de auditor" });
    return;
  }
  res.status(201).json(auditor);
};

const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body as {
    email: string;
    password: string;
    role: UserRole;
  };

  if (role !== "manager" && role !== "auditor") {
    res.status(400).json({ error: "Perfil inválido. Use 'manager' ou 'auditor'" });
    return;
  }

  const result = await AuthService.loginUser(email, password, role);
  if (!result) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  res.status(200).json(result);
};

const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  const tokens = await AuthService.refresh(refreshToken);
  if (!tokens) {
    res.status(401).json({ error: "Refresh token inválido ou expirado" });
    return;
  }
  res.status(200).json(tokens);
};

const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  await AuthService.logout(refreshToken);
  res.status(204).send();
};

export default {
  registerManager,
  registerAuditor,
  loginUser,
  refreshToken,
  logout,
};
