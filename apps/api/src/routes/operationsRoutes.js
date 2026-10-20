import { Router } from "express";
import { randomBytes } from "node:crypto";
import { ensure } from "../models/validation.js";
import { publicUser } from "../services/operationsService.js";
import { createOrderController } from "../controllers/orderController.js";
export function createOperationsRoutes(
  service,
  { demo = false, secureCookies = process.env.NODE_ENV === "production" } = {},
) {
  const router = Router(),
    sessions = new Map(),
    attempts = new Map();
  const lifetime = 8 * 60 * 60 * 1000;
  let streams = 0;
  const cookie = (value, maxAge) =>
    `ao_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookies ? "; Secure" : ""}`;
  const token = (req) =>
    req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("ao_session="))
      ?.slice(11);
  const session = async (req, res, next) => {
    const key = token(req),
      s = sessions.get(key);
    if (!s || s.expiresAt < Date.now()) {
      sessions.delete(key);
      return res
        .status(401)
        .json({ message: "Entre para acessar o atendimento." });
    }
    const user = await service.user(s.id);
    if (!user) {
      sessions.delete(key);
      return res.status(401).json({ message: "Sessão expirada." });
    }
    req.actor = user;
    next();
  };
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin) {
        let host;
        try {
          host = new URL(origin).host;
        } catch {}
        ensure(
          host === req.headers.host,
          "Origem da requisição inválida.",
          403,
        );
      }
      ensure(req.is("application/json"), "Envie dados em JSON.", 415);
      ensure(
        req.body && typeof req.body === "object" && !Array.isArray(req.body),
        "Corpo da requisição inválido.",
      );
    }
    next();
  });
  router.get("/status", async (_req, res) => res.json(await service.status()));
  router.get("/ready", async (_req, res) => {
    await service.status();
    res.json({ status: "ready" });
  });
  router.get("/display", async (_req, res) =>
    res.json(await service.display()),
  );
  router.post("/orders", createOrderController(service));
  router.get("/orders/:id/status", async (req, res) =>
    res.json(await service.track(req.params.id)),
  );
  router.get("/events", async (req, res) => {
    ensure(streams < 50, "Limite de conexões do painel atingido.", 503);
    streams++;
    res.set({
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    let last = "",
      busy = false,
      closed = false;
    const send = async () => {
      if (busy || closed) return;
      busy = true;
      try {
        const data = JSON.stringify(await service.display());
        if (data !== last) {
          last = data;
          if (!closed) res.write(`data: ${data}\n\n`);
        } else if (!closed) res.write(": heartbeat\n\n");
      } catch {
        if (!closed) res.write("event: unavailable\ndata: {}\n\n");
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(send, 2000);
    timer.unref();
    res.on("close", () => {
      closed = true;
      streams--;
      clearInterval(timer);
    });
    await send();
  });
  router.post("/auth/login", async (req, res) => {
    const key = req.ip,
      now = Date.now();
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key);
    const attempt = attempts.get(key) ?? {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    if (attempt.count >= 10) {
      res.set("Retry-After", String(Math.ceil((attempt.until - now) / 1000)));
      return res
        .status(429)
        .json({ message: "Muitas tentativas. Aguarde 15 minutos." });
    }
    attempt.count++;
    attempts.set(key, attempt);
    const user = await service.login(req.body.email, req.body.password);
    attempts.delete(key);
    for (const [key, s] of sessions)
      if (s.expiresAt < now) sessions.delete(key);
    ensure(
      sessions.size < 1000,
      "Limite de sessões atingido. Tente mais tarde.",
      503,
    );
    const value = randomBytes(32).toString("hex");
    sessions.set(value, { id: user.id, expiresAt: now + lifetime });
    res.set("Set-Cookie", cookie(value, lifetime / 1000)).json({ user, demo });
  });
  router.post("/auth/logout", (req, res) => {
    sessions.delete(token(req));
    res.set("Set-Cookie", cookie("", 0)).json({ ok: true });
  });
  router.get("/auth/me", session, (req, res) =>
    res.json({ user: req.actor, demo }),
  );
  router.get("/operations", session, async (req, res) =>
    res.json(await service.dashboard(req.actor)),
  );
  router.post("/calls/next", session, async (req, res) =>
    res.json({ order: await service.next(req.actor) }),
  );
  router.post("/orders/:id/reissue", session, async (req, res) =>
    res.json({ order: await service.reissue(req.actor, req.params.id) }),
  );
  router.post("/orders/:id/complete", session, async (req, res) =>
    res.json({ order: await service.complete(req.actor, req.params.id) }),
  );
  router.get("/admin", session, async (req, res) =>
    res.json(await service.admin(req.actor)),
  );
  router.post("/orders/:id/restore", session, async (req, res) =>
    res.json({ order: await service.restore(req.actor, req.params.id) }),
  );
  router.post("/admin/cuts", session, async (req, res) =>
    res
      .status(201)
      .json({ cut: await service.saveCut(req.actor, null, req.body) }),
  );
  router.put("/admin/cuts/:id", session, async (req, res) =>
    res.json({
      cut: await service.saveCut(req.actor, req.params.id, req.body),
    }),
  );
  router.delete("/admin/cuts/:id", session, async (req, res) =>
    res.json({ cut: await service.removeCut(req.actor, req.params.id) }),
  );
  router.post("/admin/users", session, async (req, res) =>
    res
      .status(201)
      .json({ user: await service.saveUser(req.actor, null, req.body) }),
  );
  router.put("/admin/users/:id", session, async (req, res) => {
    const user = await service.saveUser(req.actor, req.params.id, req.body);
    for (const [key, s] of sessions) if (s.id === user.id) sessions.delete(key);
    res.json({ user: publicUser(user) });
  });
  router.put("/admin/settings", session, async (req, res) =>
    res.json({ settings: await service.saveSettings(req.actor, req.body) }),
  );
  return router;
}
