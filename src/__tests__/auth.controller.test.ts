import { Request, Response } from "express";
import AuthController from "../controllers/authController";
import AuthService from "../services/authService";

jest.mock("../services/authService");
const mockService = AuthService as jest.Mocked<typeof AuthService>;

const buildRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("registerManager", () => {
  it("Retorna 400 quando service retorna null", async () => {
    mockService.registerManager.mockResolvedValue(null);
    const req = { body: { name: "", email: "", password: "" } } as Request;
    const res = buildRes();

    await AuthController.registerManager(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Dados inválidos para cadastro de gerente",
    });
  });

  it("Retorna 201 com o gerente criado", async () => {
    const manager = { id: "1", name: "M", email: "m@a.com" };
    mockService.registerManager.mockResolvedValue(manager);
    const req = {
      body: { name: "M", email: "m@a.com", password: "pwd" },
    } as Request;
    const res = buildRes();

    await AuthController.registerManager(req, res);

    expect(mockService.registerManager).toHaveBeenCalledWith("M", "m@a.com", "pwd");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(manager);
  });

  it("Retorna 409 quando o email já está cadastrado (UNIQUE violation)", async () => {
    mockService.registerManager.mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: "23505" }),
    );
    const req = {
      body: { name: "M", email: "m@a.com", password: "pwd" },
    } as Request;
    const res = buildRes();

    await AuthController.registerManager(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Email já cadastrado" });
  });

  it("Retorna 500 quando o service lança erro genérico", async () => {
    mockService.registerManager.mockRejectedValue(new Error("db down"));
    const req = {
      body: { name: "M", email: "m@a.com", password: "pwd" },
    } as Request;
    const res = buildRes();

    await AuthController.registerManager(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao cadastrar gerente" });
  });
});

describe("registerAuditor", () => {
  it("Retorna 400 quando service retorna null", async () => {
    mockService.registerAuditor.mockResolvedValue(null);
    const req = { body: {} } as Request;
    const res = buildRes();

    await AuthController.registerAuditor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("Retorna 201 com o auditor criado", async () => {
    const auditor = {
      id: "2",
      name: "A",
      email: "a@a.com",
      registration_number: 99,
      is_active: true,
    };
    mockService.registerAuditor.mockResolvedValue(auditor);
    const req = {
      body: {
        name: "A",
        email: "a@a.com",
        password: "pwd",
        registration_number: 99,
      },
    } as Request;
    const res = buildRes();

    await AuthController.registerAuditor(req, res);

    expect(mockService.registerAuditor).toHaveBeenCalledWith(
      "A",
      "a@a.com",
      "pwd",
      99,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(auditor);
  });

  it("Retorna 409 em UNIQUE violation (email ou matrícula duplicados)", async () => {
    mockService.registerAuditor.mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: "23505" }),
    );
    const req = {
      body: {
        name: "A",
        email: "a@a.com",
        password: "pwd",
        registration_number: 99,
      },
    } as Request;
    const res = buildRes();

    await AuthController.registerAuditor(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email ou matrícula já cadastrados",
    });
  });

  it("Retorna 500 quando o service lança erro genérico", async () => {
    mockService.registerAuditor.mockRejectedValue(new Error("db down"));
    const req = {
      body: {
        name: "A",
        email: "a@a.com",
        password: "pwd",
        registration_number: 99,
      },
    } as Request;
    const res = buildRes();

    await AuthController.registerAuditor(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao cadastrar auditor" });
  });
});

describe("loginUser", () => {
  it("Retorna 400 se role inválido", async () => {
    const req = {
      body: { email: "a", password: "b", role: "admin" },
    } as Request;
    const res = buildRes();

    await AuthController.loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockService.loginUser).not.toHaveBeenCalled();
  });

  it("Retorna 401 se credenciais inválidas", async () => {
    mockService.loginUser.mockResolvedValue(null);
    const req = {
      body: { email: "a@a.com", password: "wrong", role: "manager" },
    } as Request;
    const res = buildRes();

    await AuthController.loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("Retorna 200 com user e tokens em caso de sucesso", async () => {
    const result = {
      user: {
        id: "1",
        name: "M",
        email: "m@a.com",
        role: "manager" as const,
      },
      tokens: { accessToken: "acc", refreshToken: "ref" },
    };
    mockService.loginUser.mockResolvedValue(result);
    const req = {
      body: { email: "m@a.com", password: "pwd", role: "manager" },
    } as Request;
    const res = buildRes();

    await AuthController.loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it("Retorna 500 quando o service lança erro inesperado", async () => {
    mockService.loginUser.mockRejectedValue(new Error("db down"));
    const req = {
      body: { email: "m@a.com", password: "pwd", role: "manager" },
    } as Request;
    const res = buildRes();

    await AuthController.loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao autenticar usuário" });
  });
});

describe("refreshToken", () => {
  it("Retorna 401 se refresh inválido", async () => {
    mockService.refresh.mockResolvedValue(null);
    const req = { body: { refreshToken: "bad" } } as Request;
    const res = buildRes();

    await AuthController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("Retorna 200 com tokens novos", async () => {
    const tokens = { accessToken: "new-a", refreshToken: "new-r" };
    mockService.refresh.mockResolvedValue(tokens);
    const req = { body: { refreshToken: "old" } } as Request;
    const res = buildRes();

    await AuthController.refreshToken(req, res);

    expect(mockService.refresh).toHaveBeenCalledWith("old");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tokens);
  });

  it("Retorna 500 quando o service lança erro inesperado", async () => {
    mockService.refresh.mockRejectedValue(new Error("db down"));
    const req = { body: { refreshToken: "tok" } } as Request;
    const res = buildRes();

    await AuthController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao renovar token" });
  });
});

describe("logout", () => {
  it("Retorna 204 e chama service.logout", async () => {
    mockService.logout.mockResolvedValue();
    const req = { body: { refreshToken: "tok" } } as Request;
    const res = buildRes();

    await AuthController.logout(req, res);

    expect(mockService.logout).toHaveBeenCalledWith("tok");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it("Retorna 500 quando o service lança erro inesperado", async () => {
    mockService.logout.mockRejectedValue(new Error("db down"));
    const req = { body: { refreshToken: "tok" } } as Request;
    const res = buildRes();

    await AuthController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao encerrar sessão" });
  });
});
