import jwt, { SignOptions, Secret } from "jsonwebtoken";
import crypto from "crypto";
import { JwtPayload } from "../types/user.types";

const ACCESS_SECRET: Secret = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret";
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES ?? "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES ?? "7d") as SignOptions["expiresIn"];

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });

export const signRefreshToken = (
  payload: JwtPayload,
): { token: string; expiresAt: Date } => {
  const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, expiresAt: new Date(exp * 1000) };
};

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload;

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
