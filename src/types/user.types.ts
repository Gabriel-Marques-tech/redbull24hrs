export type UserRole = "manager" | "auditor";

export interface Manager {
  id: string;
  name: string;
  email: string;
  image_url?: string | null;
}

export interface ManagerPassword extends Manager {
  password: string;
}

export interface Auditor {
  id: string;
  name: string;
  email: string;
  registration_number: number;
  is_active: boolean;
  image_url?: string | null;
}

export interface AuditorPassword extends Auditor {
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image_url?: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  image_url?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
