import { pool } from "../database/connection";

const registerManager = async (
	name: string,
	email: string,
	password: string,
) => {
	const user = pool.query(
		`INSERT INTO managers (name, password, email) 
		VALUES ($1, $2, $3)
		RETURNING id, name, email`,
		[name, password, email],
	);

	return user;
};

const registerAuditor = async (
	name: string,
	email: string,
	password: string,
) => {
	const user = pool.query(
		`INSERT INTO managers (name, password, email) 
		VALUES ($1, $2, $3)
		RETURNING id, name, email`,
		[name, password, email],
	);

	return user;
};

const loginUser = async (email: string, password: string) => {
	const user = pool.query(`SELECT id, password, email FROM managers`);
};

export default { registerAuditor };
