import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UserRole } from "../types/user.types";
import AuthService from "../services/authService";

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: "Token de acesso ausente" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      image_url: payload.image_url ?? null,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token de acesso inválido ou expirado" });
  }
};

const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Acesso negado para este perfil" });
      return;
    }
    next();
  };
};

const requirePageAuth = async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.accessToken

    // Token presente — verifica validade
    if (accessToken) {
        try {
            const payload = verifyAccessToken(accessToken)
            req.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                name: payload.name,
                image_url: payload.image_url ?? null,
            }
            next()
            return
        } catch {
            // Token expirado/inválido — tenta refresh abaixo
        }
    }

    // Sem accessToken válido — tenta renovar com refreshToken
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
        res.redirect('/login')
        return
    }

    const tokens = await AuthService.refresh(refreshToken)
    if (!tokens) {
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.redirect('/login')
        return
    }

    // Seta novos cookies e continua
    res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
    })
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    try {
        const payload = verifyAccessToken(tokens.accessToken)
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            name: payload.name,
            image_url: payload.image_url ?? null,
        }
    } catch {
        res.redirect('/login')
        return
    }

    next()
}

export default { requireAuth, requireRole, requirePageAuth };
