import UserRepository from "../repositories/userRepository";
import bcrypt from "bcrypt";
import { Manager } from "../types/user.types";

const registerManager = async (
  name: string,
  email: string,
  password: string,
): Promise<Manager | null> => {
  if (!name || !email || !password) return null;
  else {
    const saltRounds: number = 10;
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);
    const user = await UserRepository.registerManager(
      name,
      email,
      hashedPassword,
    );

    return user;
  }
};

export default { registerManager };
