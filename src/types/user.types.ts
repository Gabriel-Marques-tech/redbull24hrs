export interface Manager {
  id: string;
  name: string;
  email: string;
}

export interface ManagerPassword extends Manager {
  HashedPassword: string;
}
