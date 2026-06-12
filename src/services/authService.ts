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
): Promise<Manager | null> => {
  if (!name || !email || !password) return null;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return UserRepository.registerManager(name, email, hashedPassword);
};

const registerAuditor = async (
  name: string,
  email: string,
  password: string,
  registration_number: number,
): Promise<Auditor | null> => {
  if (!name || !email || !password || !registration_number) return null;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return UserRepository.registerAuditor(
    name,
    email,
    hashedPassword,
    registration_number,
  );
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

export default { registerManager, registerAuditor, loginUser, refresh, logout, listAuditors };
