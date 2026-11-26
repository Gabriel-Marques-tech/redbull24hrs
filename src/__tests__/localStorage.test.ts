import express from "express";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import { createLocalStorageRouter, LOCAL_STORAGE_PREFIX } from "../routes/localStorageRoutes";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rr-storage-"));
const app = express();
app.use(LOCAL_STORAGE_PREFIX, createLocalStorageRouter());
const auth = { Authorization: "Bearer chave-teste" };
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

beforeAll(() => {
  process.env.LOCAL_STORAGE_DIR = dir;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-teste";
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.LOCAL_STORAGE_DIR;
});

describe("armazenamento local de imagens", () => {
  it("grava com a chave e devolve o mesmo conteúdo na URL pública", async () => {
    const up = await request(app)
      .post("/storage/v1/object/photos/events/a.png")
      .set(auth)
      .set("Content-Type", "image/png")
      .send(png);
    expect(up.status).toBe(200);

    const down = await request(app).get("/storage/v1/object/public/photos/events/a.png");
    expect(down.status).toBe(200);
    expect(down.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(down.body, png)).toBe(0);
  });

  it("recusa gravação sem a chave de serviço", async () => {
    const res = await request(app)
      .post("/storage/v1/object/photos/events/b.png")
      .set("Content-Type", "image/png")
      .send(png);
    expect(res.status).toBe(401);
    expect(fs.existsSync(path.join(dir, "photos/events/b.png"))).toBe(false);
  });

  it("recusa caminho que tenta sair da pasta base", async () => {
    const res = await request(app)
      .post("/storage/v1/object/photos/%2e%2e%2f%2e%2e%2ffora.png")
      .set(auth)
      .set("Content-Type", "image/png")
      .send(png);
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(dir, "..", "fora.png"))).toBe(false);
  });

  it("responde 404 para arquivo inexistente", async () => {
    const res = await request(app).get("/storage/v1/object/public/photos/nao-existe.png");
    expect(res.status).toBe(404);
  });

  it("remove o arquivo com a chave", async () => {
    await request(app).post("/storage/v1/object/photos/c.png").set(auth).set("Content-Type", "image/png").send(png);
    const del = await request(app).delete("/storage/v1/object/photos/c.png").set(auth);
    expect(del.status).toBe(200);
    expect(fs.existsSync(path.join(dir, "photos/c.png"))).toBe(false);
  });
});
