import { pool } from "../database/connection";
import {
  Manager,
  ManagerPassword,
  Auditor,
  AuditorPassword,
  UserRole,
} from "../types/user.types";

const registerManager = async (
  name: string,
  email: string,
  password: string,
): Promise<Manager> => {
  const result = await pool.query(
    `INSERT INTO managers (name, password, email)
     VALUES ($1, $2, $3)
     RETURNING id, name, email`,
    [name, password, email],
  );
  return result.rows[0];
};

const registerAuditor = async (
  name: string,
  email: string,
  password: string,
  registration_number: number,
): Promise<Auditor> => {
  const result = await pool.query(
    `INSERT INTO auditors (name, password, email, registration_number)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, registration_number, is_active`,
    [name, password, email, registration_number],
  );
  return result.rows[0];
};

const findManagerByEmail = async (
  email: string,
): Promise<ManagerPassword | null> => {
  const result = await pool.query(
    `SELECT id, name, email, password FROM managers WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
};

const findAuditorByEmail = async (
  email: string,
): Promise<AuditorPassword | null> => {
  const result = await pool.query(
    `SELECT id, name, email, password, registration_number, is_active
     FROM auditors WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
};

const saveRefreshToken = async (
  tokenHash: string,
  userId: string,
  role: UserRole,
  expiresAt: Date,
): Promise<void> => {
  const managerId = role === "manager" ? userId : null;
  const auditorId = role === "auditor" ? userId : null;
  await pool.query(
    `INSERT INTO refresh_tokens (token_hash, manager_id, auditor_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [tokenHash, managerId, auditorId, expiresAt],
  );
};

const findActiveRefreshToken = async (
  tokenHash: string,
): Promise<{
  id: string;
  user_id: string;
  user_role: UserRole;
  expires_at: Date;
} | null> => {
  const result = await pool.query(
    `SELECT id, manager_id, auditor_id, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  const isManager = row.manager_id != null;
  return {
    id: String(row.id),
    user_id: String(isManager ? row.manager_id : row.auditor_id),
    user_role: isManager ? "manager" : "auditor",
    expires_at: row.expires_at,
  };
};

const revokeRefreshToken = async (tokenHash: string): Promise<void> => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
    [tokenHash],
  );
};

const listAuditors = async (): Promise<{ id: number; name: string; email: string }[]> => {
  const result = await pool.query(
    `SELECT id, name, email FROM auditors WHERE is_active = TRUE ORDER BY name ASC`
  );
  return result.rows;
};

export default {
  registerManager,
  registerAuditor,
  findManagerByEmail,
  findAuditorByEmail,
  saveRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  listAuditors,
};
