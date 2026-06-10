import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UserRole } from "../types/user.types";

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acesso ausente" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
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

const requirePageAuth = (req: Request, res: Response, next: NextFunction) => {

	const token = req.cookies.accessToken
	if (!token ) {
		res.redirect('/login')
		return
	}

	next()
}

export default { requireAuth, requireRole, requirePageAuth };
