import { describe, it, expect, vi, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../src/infrastructure/database/db", () => {
  const raw = vi.fn(async () => ({ rows: [] }));
  return { db: { raw } };
});
vi.mock("../src/application/services/CreateAuditLog", () => ({
  CreateAuditLog: class {
    execute = vi.fn(async () => undefined);
  },
}));

import procurementRoutes from "../src/presentation/routes/procurementRoutes";

const SECRET = "test-secret";
const tokenFor = (role: string) =>
  jwt.sign({ userId: 1, email: `${role}@test.local`, role }, SECRET);

const app = express();
app.use(express.json());
app.use(procurementRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

const ROUTES: Array<[string, string]> = [
  ["get", "/procurement/requests"],
  ["post", "/procurement/requests"],
  ["put", "/procurement/requests/1"],
  ["post", "/procurement/requests/1/deliver"],
  ["post", "/procurement/requests/1/cancel"],
];

describe("Purchase Request Log access", () => {
  it.each(ROUTES)("%s %s without a token is 401", async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
  });

  it.each(ROUTES)("%s %s as a non-PRL role is 403", async (method, url) => {
    for (const role of ["Staff", "Admin", "Viewer"]) {
      const res = await (request(app) as any)[method](url).set("Authorization", `Bearer ${tokenFor(role)}`);
      expect(res.status).toBe(403);
    }
  });

  it.each(["Procurement", "IT Manager", "IT Administrator", "Super Admin"])(
    "%s passes the role gate and can load the list",
    async (role) => {
      const res = await request(app)
        .get("/procurement/requests")
        .set("Authorization", `Bearer ${tokenFor(role)}`);
      expect(res.status).toBe(200);
    }
  );

  it("IT Support can view, add and edit", async () => {
    const auth = `Bearer ${tokenFor("IT Support")}`;
    expect((await request(app).get("/procurement/requests").set("Authorization", auth)).status).toBe(200);
    // empty body reaches validation (400), proving the role gate was passed
    expect((await request(app).post("/procurement/requests").set("Authorization", auth).send({})).status).toBe(400);
    expect((await request(app).put("/procurement/requests/1").set("Authorization", auth).send({})).status).not.toBe(403);
  });

  it("IT Support cannot deliver or cancel (403)", async () => {
    const auth = `Bearer ${tokenFor("IT Support")}`;
    expect((await request(app).post("/procurement/requests/1/deliver").set("Authorization", auth)).status).toBe(403);
    expect((await request(app).post("/procurement/requests/1/cancel").set("Authorization", auth)).status).toBe(403);
  });

  it("an unknown role string is denied (default deny)", async () => {
    const res = await request(app)
      .get("/procurement/requests")
      .set("Authorization", `Bearer ${tokenFor("procurement")}`);
    expect(res.status).toBe(403);
  });
});
