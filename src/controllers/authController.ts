import { Request, Response } from "express";
import AuthService from "../services/authService";
import { UserRole } from "../types/user.types";
import { uploadToStorage } from "../utils/supabaseStorage";

const PG_UNIQUE_VIOLATION = "23505";

const registerManager = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  try {
    let image_url: string | null = null;
    if (req.file) {
      image_url = await uploadToStorage(req.file.buffer, req.file.mimetype, req.file.originalname, "photos", "users");
    }
    const manager = await AuthService.registerManager(name, email, password, image_url);
    if (!manager) {
      res.status(400).json({ error: "Dados inválidos para cadastro de gerente" });
      return;
    }
    res.status(201).json(manager);
  } catch (error: any) {
    if (error?.code === PG_UNIQUE_VIOLATION) {
      res.status(409).json({ error: "Email já cadastrado" });
      return;
    }
    res.status(500).json({ error: "Erro ao cadastrar gerente" });
  }
};

const registerAuditor = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, registration_number } = req.body;
  try {
    let image_url: string | null = null;
    if (req.file) {
      image_url = await uploadToStorage(req.file.buffer, req.file.mimetype, req.file.originalname, "photos", "users");
    }
    const regNum = registration_number ? Number(registration_number) : undefined;
    const auditor = await AuthService.registerAuditor(name, email, password, image_url, regNum);
    if (!auditor) {
      res.status(400).json({ error: "Dados inválidos para cadastro de auditor" });
      return;
    }
    res.status(201).json(auditor);
  } catch (error: any) {
    if (error?.code === PG_UNIQUE_VIOLATION) {
      res.status(409).json({ error: "Email ou matrícula já cadastrados" });
      return;
    }
    res.status(500).json({ error: "Erro ao cadastrar auditor" });
  }
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

  try {
    const result = await AuthService.loginUser(email, password, role);
    if (!result) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const {user, tokens} = result
    const {accessToken, refreshToken} = tokens
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
     res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    })
    res.status(200).json({ user });
  } catch {
    res.status(500).json({ error: "Erro ao autenticar usuário" });
  }
};

const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const  refreshToken  = req.cookies?.refreshToken;
  try {
    const tokens = await AuthService.refresh(refreshToken);
    if (!tokens) {
      res.status(401).json({ error: "Refresh token inválido ou expirado" });
      return;
    }
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json(tokens);
  } catch {
    res.status(500).json({ error: "Erro ao renovar token" });
  }
};

const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
  try {
    await AuthService.logout(refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};

const listAuditors = async (req: Request, res: Response): Promise<void> => {
  try {
    const auditors = await AuthService.listAuditors();
    res.status(200).json(auditors);
  } catch {
    res.status(500).json({ error: "Erro ao listar auditores" });
  }
};

export default {
  registerManager,
  registerAuditor,
  loginUser,
  refreshToken,
  logout,
  listAuditors,
};
