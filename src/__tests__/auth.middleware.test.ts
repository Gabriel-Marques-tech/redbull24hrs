import { Request, Response, NextFunction } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import * as jwtUtils from "../utils/jwt";

jest.mock("../utils/jwt");
const mockJwt = jwtUtils as jest.Mocked<typeof jwtUtils>;

const buildRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireAuth", () => {
  it("Deve retornar 401 se header Authorization ausente", () => {
    const req = { headers: {} } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Deve retornar 401 se header não começa com 'Bearer '", () => {
    const req = { headers: { authorization: "Token abc" } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Deve retornar 401 se verifyAccessToken lança erro", () => {
    mockJwt.verifyAccessToken.mockImplementation(() => {
      throw new Error("expired");
    });
    const req = { headers: { authorization: "Bearer bad-token" } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Deve anexar req.user e chamar next quando token válido", () => {
    mockJwt.verifyAccessToken.mockReturnValue({
      sub: "42",
      email: "a@a.com",
      name: "Auditor 42",
      role: "auditor",
    });
    const req = { headers: { authorization: "Bearer good-token" } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireAuth(req, res, next);

    expect(mockJwt.verifyAccessToken).toHaveBeenCalledWith("good-token");
    expect(req.user).toEqual({
      id: "42",
      email: "a@a.com",
      role: "auditor",
      name: "Auditor 42",
      image_url: null,
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it("Deve retornar 401 se req.user ausente", () => {
    const req = {} as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireRole("manager")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Deve retornar 403 se role do usuário não está autorizada", () => {
    const req = {
      user: { id: "1", email: "a", name: "", role: "auditor" as const },
    } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireRole("manager")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("Deve chamar next quando role está na lista permitida", () => {
    const req = {
      user: { id: "1", email: "a", name: "", role: "manager" as const },
    } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    AuthMiddleware.requireRole("manager", "auditor")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
