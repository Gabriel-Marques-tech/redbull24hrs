import bcrypt from "bcrypt";
import UserRepository from "../repositories/userRepository";
import {
  Manager,
  Auditor,
  AuthResult,
  AuthTokens,
  AuthUser,
  JwtPayload,
  UserRole,
} from "../types/user.types";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/jwt";

const SALT_ROUNDS = 10;

const issueTokens = async (user: AuthUser): Promise<AuthTokens> => {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image_url: user.image_url ?? null,
  };
  const accessToken = signAccessToken(payload);
  const { token: refreshToken, expiresAt } = signRefreshToken(payload);

  await UserRepository.saveRefreshToken(
    hashToken(refreshToken),
    user.id,
    user.role,
    expiresAt,
  );

  return { accessToken, refreshToken };
};

const registerManager = async (
  name: string,
  email: string,
  password: string,
  image_url?: string | null,
): Promise<Manager | null> => {
  if (!name || !email || !password) return null;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return UserRepository.registerManager(name, email, hashedPassword, image_url);
};

const registerAuditor = async (
  name: string,
  email: string,
  password: string,
  image_url?: string | null,
  registration_number?: number,
): Promise<Auditor | null> => {
  if (!name || !email || !password) return null;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return UserRepository.registerAuditor(name, email, hashedPassword, image_url, registration_number);
};

const loginUser = async (
  email: string,
  password: string,
  role: UserRole,
): Promise<AuthResult | null> => {
  if (!email || !password || !role) return null;

  if (role === "manager") {
    const record = await UserRepository.findManagerByEmail(email);
    if (!record) return null;
    const ok = await bcrypt.compare(password, record.password);
    if (!ok) return null;
    const user: AuthUser = {
      id: String(record.id),
      name: record.name,
      email: record.email,
      role,
      image_url: record.image_url ?? null,
    };
    const tokens = await issueTokens(user);
    return { user, tokens };
  }

  const record = await UserRepository.findAuditorByEmail(email);
  if (!record || !record.is_active) return null;
  const ok = await bcrypt.compare(password, record.password);
  if (!ok) return null;
  const user: AuthUser = {
    id: String(record.id),
    name: record.name,
    email: record.email,
    role,
    image_url: record.image_url ?? null,
  };
  const tokens = await issueTokens(user);
  return { user, tokens };
};

const refresh = async (refreshToken: string): Promise<AuthTokens | null> => {
  if (!refreshToken) return null;

  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await UserRepository.findActiveRefreshToken(tokenHash);
  if (!stored) return null;

  await UserRepository.revokeRefreshToken(tokenHash);

  const user: AuthUser = {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    image_url: payload.image_url ?? null,
  };
  return issueTokens(user);
};

const logout = async (refreshToken: string): Promise<void> => {
  if (!refreshToken) return;
  await UserRepository.revokeRefreshToken(hashToken(refreshToken));
};

const listAuditors = async () => {
  return UserRepository.listAuditors();
};

export const MIN_PASSWORD_LENGTH = 6;

export type ChangePasswordResult = "ok" | "invalid" | "same" | "wrong_current" | "not_found";

// Troca a senha do próprio usuário logado: exige a senha atual.
const changePassword = async (
  role: UserRole,
  id: number,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> => {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return "invalid";
  if (!currentPassword || newPassword.length < MIN_PASSWORD_LENGTH) return "invalid";
  if (currentPassword === newPassword) return "same";

  const storedHash = await UserRepository.findPasswordHashById(role, id);
  if (!storedHash) return "not_found";

  const matches = await bcrypt.compare(currentPassword, storedHash);
  if (!matches) return "wrong_current";

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await UserRepository.updatePassword(role, id, newHash);
  return updated ? "ok" : "not_found";
};

// Lista de contas para a tela de gerenciamento do gerente (sem senhas).
const listUsers = async () => {
  const [managers, auditors] = await Promise.all([
    UserRepository.listManagers(),
    UserRepository.listAuditors(),
  ]);
  return [
    ...managers.map((m) => ({ id: m.id, name: m.name, email: m.email, role: "manager" as UserRole })),
    ...auditors.map((a) => ({ id: a.id, name: a.name, email: a.email, role: "auditor" as UserRole })),
  ];
};

export type ResetPasswordResult = "ok" | "invalid" | "not_found";

// Um gerente define uma nova senha para outra conta (não pede a senha atual dela).
const resetPassword = async (role: UserRole, id: number, newPassword: string): Promise<ResetPasswordResult> => {
  if (role !== "manager" && role !== "auditor") return "invalid";
  if (!Number.isInteger(id) || id <= 0) return "invalid";
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) return "invalid";

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await UserRepository.updatePassword(role, id, newHash);
  return updated ? "ok" : "not_found";
};

export default { registerManager, registerAuditor, loginUser, refresh, logout, listAuditors, changePassword, listUsers, resetPassword };
