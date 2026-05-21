import { pool } from "../database/connection";
import { Manager } from "../types/user.types";

const registerManager = async (
  name: string,
  email: string,
  password: string,
) => {
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
): Promise<Manager> => {
  const result = await pool.query(
    `INSERT INTO managers (name, password, email) 
		VALUES ($1, $2, $3)
		RETURNING id, name, email`,
    [name, password, email],
  );

  return result.rows[0];
};

const loginUser = async (email: string, password: string) => {
  const user = await pool.query(`SELECT id, password, email FROM managers`);
};

export default { registerManager };
