import UserRepository from "../repositories/userRepository";
import bcrypt from "bcrypt";

const registerUser = async (name: string, email: string, password: string) => {
	if (!name || !email || !password) return null;
	else {
		const saltRounds: number = 10;
		const hashedPassword: string = await bcrypt.hash(password, saltRounds);
		const user = UserRepository.registerUser(name, email, hashedPassword);

		return user;
	}
};

export default { registerUser };
