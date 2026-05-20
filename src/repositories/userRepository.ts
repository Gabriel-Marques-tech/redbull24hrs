import { pool } from "../database/connection";

const registerUser = async (name: string, email: string, password: string) => {
	const user = pool.query(
		`INSERT INTO managers (name, password, email) 
		VALUES ($1, $2, $3)
		RETURNING id, name, email`,
		[name, password, email],
	);

	return user;
};

export default { registerUser };
