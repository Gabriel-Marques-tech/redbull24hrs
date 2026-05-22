//tipo do gerente
export interface Manager {
  id: string;
  name: string;
  email: string;
}

//tipo do gerente com senha
export interface ManagerPassword extends Manager {
  HashedPassword: string;
}
