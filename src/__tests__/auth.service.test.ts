import authService from "../services/authService";
import userRepository from "../repositories/userRepository";
import bcrypt from "bcrypt";
import * as jwtUtils from "../utils/jwt";

jest.mock("../repositories/userRepository");
jest.mock("bcrypt");
jest.mock("../utils/jwt");

const mockRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwtUtils as jest.Mocked<typeof jwtUtils>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("registerManager", () => {
  it("Deve retornar null quando nome for vazio", async () => {
    const result = await authService.registerManager("", "tester@gmail.com", "12345");
    expect(result).toBeNull();
    expect(mockRepo.registerManager).not.toHaveBeenCalled();
  });

  it("Deve retornar null quando email for vazio", async () => {
    const result = await authService.registerManager("Tester", "", "12345");
    expect(result).toBeNull();
  });

  it("Deve retornar null quando senha for vazia", async () => {
    const result = await authService.registerManager("Tester", "tester@gmail.com", "");
    expect(result).toBeNull();
  });

  it("Deve hashear a senha e persistir o gerente", async () => {
    (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashed-pwd");
    mockRepo.registerManager.mockResolvedValue({
      id: "1",
      name: "Tester",
      email: "tester@gmail.com",
    });

    const result = await authService.registerManager(
      "Tester",
      "tester@gmail.com",
      "1234",
    );

    expect(mockBcrypt.hash).toHaveBeenCalledWith("1234", 10);
    expect(mockRepo.registerManager).toHaveBeenCalledWith(
      "Tester",
      "tester@gmail.com",
      "hashed-pwd",
      undefined,
    );
    expect(result).toEqual({ id: "1", name: "Tester", email: "tester@gmail.com" });
  });
});

describe("registerAuditor", () => {
  it("Deve retornar null quando algum campo obrigatório está ausente", async () => {
    expect(await authService.registerAuditor("", "a@a.com", "123")).toBeNull();
    expect(await authService.registerAuditor("A", "", "123")).toBeNull();
    expect(await authService.registerAuditor("A", "a@a.com", "")).toBeNull();
    expect(mockRepo.registerAuditor).not.toHaveBeenCalled();
  });

  it("Deve hashear a senha e persistir o auditor", async () => {
    (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashed");
    mockRepo.registerAuditor.mockResolvedValue({
      id: "5",
      name: "Aud",
      email: "aud@a.com",
      registration_number: 1000,
      is_active: true,
    });

    const result = await authService.registerAuditor("Aud", "aud@a.com", "pwd");

    expect(mockBcrypt.hash).toHaveBeenCalledWith("pwd", 10);
    expect(mockRepo.registerAuditor).toHaveBeenCalledWith(
      "Aud",
      "aud@a.com",
      "hashed",
      undefined,
      undefined,
    );
    expect(result?.registration_number).toBe(1000);
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    mockJwt.signAccessToken.mockReturnValue("access-token");
    mockJwt.signRefreshToken.mockReturnValue({
      token: "refresh-token",
      expiresAt: new Date("2030-01-01"),
    });
    mockJwt.hashToken.mockReturnValue("hashed-refresh");
  });

  it("Deve retornar null se email/senha/perfil ausente", async () => {
    expect(await authService.loginUser("", "p", "manager")).toBeNull();
    expect(await authService.loginUser("e", "", "manager")).toBeNull();
    expect(
      await authService.loginUser("e", "p", "" as unknown as "manager"),
    ).toBeNull();
  });

  it("Deve retornar null se gerente não existir", async () => {
    mockRepo.findManagerByEmail.mockResolvedValue(null);
    const result = await authService.loginUser("a@a.com", "pwd", "manager");
    expect(result).toBeNull();
  });

  it("Deve retornar null se senha do gerente não bate", async () => {
    mockRepo.findManagerByEmail.mockResolvedValue({
      id: "1",
      name: "M",
      email: "m@a.com",
      password: "hashed",
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await authService.loginUser("m@a.com", "wrong", "manager");
    expect(result).toBeNull();
    expect(mockRepo.saveRefreshToken).not.toHaveBeenCalled();
  });

  it("Deve emitir tokens para gerente válido", async () => {
    mockRepo.findManagerByEmail.mockResolvedValue({
      id: "1",
      name: "M",
      email: "m@a.com",
      password: "hashed",
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authService.loginUser("m@a.com", "pwd", "manager");

    expect(result).toEqual({
      user: { id: "1", name: "M", email: "m@a.com", role: "manager", image_url: null },
      tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
    });
    expect(mockRepo.saveRefreshToken).toHaveBeenCalledWith(
      "hashed-refresh",
      "1",
      "manager",
      new Date("2030-01-01"),
    );
  });

  it("Deve rejeitar auditor inativo", async () => {
    mockRepo.findAuditorByEmail.mockResolvedValue({
      id: "2",
      name: "A",
      email: "a@a.com",
      password: "hashed",
      registration_number: 1,
      is_active: false,
    });

    const result = await authService.loginUser("a@a.com", "pwd", "auditor");
    expect(result).toBeNull();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("Deve emitir tokens para auditor ativo válido", async () => {
    mockRepo.findAuditorByEmail.mockResolvedValue({
      id: "2",
      name: "A",
      email: "a@a.com",
      password: "hashed",
      registration_number: 7,
      is_active: true,
    });
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authService.loginUser("a@a.com", "pwd", "auditor");

    expect(result?.user.role).toBe("auditor");
    expect(result?.tokens.accessToken).toBe("access-token");
  });
});

describe("refresh", () => {
  beforeEach(() => {
    mockJwt.signAccessToken.mockReturnValue("new-access");
    mockJwt.signRefreshToken.mockReturnValue({
      token: "new-refresh",
      expiresAt: new Date("2030-01-01"),
    });
    mockJwt.hashToken.mockReturnValue("hashed-token");
  });

  it("Deve retornar null se refresh token ausente", async () => {
    const result = await authService.refresh("");
    expect(result).toBeNull();
  });

  it("Deve retornar null se token JWT inválido", async () => {
    mockJwt.verifyRefreshToken.mockImplementation(() => {
      throw new Error("invalid");
    });

    const result = await authService.refresh("bad-token");
    expect(result).toBeNull();
    expect(mockRepo.findActiveRefreshToken).not.toHaveBeenCalled();
  });

  it("Deve retornar null se token não está ativo no banco", async () => {
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: "1",
      email: "a@a.com",
      name: "M",
      role: "manager",
    });
    mockRepo.findActiveRefreshToken.mockResolvedValue(null);

    const result = await authService.refresh("token");
    expect(result).toBeNull();
  });

  it("Deve rotacionar o token (revoga antigo e emite novo)", async () => {
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: "1",
      email: "a@a.com",
      name: "M",
      role: "manager",
    });
    mockRepo.findActiveRefreshToken.mockResolvedValue({
      id: "10",
      user_id: "1",
      user_role: "manager",
      expires_at: new Date("2030-01-01"),
    });

    const result = await authService.refresh("old-token");

    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith("hashed-token");
    expect(mockRepo.saveRefreshToken).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });
});

describe("listAuditors", () => {
  it("Delega ao repositório e retorna a lista de auditores", async () => {
    const auditores = [{ id: "1", name: "Aud", email: "a@a.com" }];
    (mockRepo.listAuditors as jest.Mock).mockResolvedValue(auditores);

    const result = await authService.listAuditors();

    expect(mockRepo.listAuditors).toHaveBeenCalled();
    expect(result).toEqual(auditores);
  });
});

describe("logout", () => {
  it("Não faz nada se refresh token ausente", async () => {
    await authService.logout("");
    expect(mockRepo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it("Revoga o refresh token informado", async () => {
    mockJwt.hashToken.mockReturnValue("hashed");
    await authService.logout("some-token");
    expect(mockJwt.hashToken).toHaveBeenCalledWith("some-token");
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith("hashed");
  });
});
