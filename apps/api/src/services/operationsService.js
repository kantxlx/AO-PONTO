import { randomUUID, createHash } from "node:crypto";
import { ensure, text, integer, quantity } from "../models/validation.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { createOrder } from "../models/order.js";
const uuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const publicUser = ({ passwordHash, ...user }) => user;
const publicOrder = ({ idempotencyKey, requestHash, ...o }) => ({
  ...o,
  totalCents: o.items.reduce((s, i) => s + i.subtotalCents, 0),
});
export function isOpen(settings, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.weekday,
  );
  const h = settings.hours.find((h) => h.weekday === day),
    time = `${parts.hour}:${parts.minute}`;
  return !!h && !h.isClosed && time >= h.opensAt && time < h.closesAt;
}
export function createOperationsService(
  store,
  { now = () => new Date() } = {},
) {
  async function authorize(tx, actor, manager = false) {
    const user = actor && (await tx.getUser(actor.id));
    ensure(user?.active, "Sessão expirada. Entre novamente.", 401);
    ensure(
      !manager || user.role === "MANAGER",
      "Acesso restrito ao gerente.",
      403,
    );
    return user;
  }
  async function call(tx, order, actor, type) {
    const timestamp = now().toISOString();
    order.status = "IN_PREPARATION";
    order.assignedTo = actor?.id ?? order.assignedTo;
    order.ticket.status = "CALLED";
    order.ticket.callCount++;
    if (type === "REISSUE") order.ticket.reissueCount++;
    order.ticket.lastCallAt = timestamp;
    await tx.saveOrder(order);
    await tx.addCall({
      ticketId: order.ticket.id,
      number: order.ticket.number,
      calledBy: actor?.id ?? null,
      type,
      calledAt: timestamp,
    });
    return publicOrder(order);
  }
  return {
    async login(email, password) {
      const normalized =
        typeof email === "string" ? email.trim().toLowerCase() : "";
      const user = await store.transaction((tx) => tx.findUser(normalized));
      // Faz o mesmo trabalho criptográfico quando a conta não existe.
      const fallback =
        "scrypt:00000000000000000000000000000000:" + "00".repeat(64);
      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? fallback,
      );
      ensure(valid && user?.active, "E-mail ou senha inválidos.", 401);
      return publicUser(user);
    },
    async user(id) {
      if (!uuid(id)) return null;
      return store.transaction(async (tx) => {
        const u = await tx.getUser(id);
        return u?.active ? publicUser(u) : null;
      });
    },
    async status() {
      return store.transaction(async (tx) => {
        const s = await tx.getSettings();
        return { open: isOpen(s, now()), timezone: s.timezone, hours: s.hours };
      });
    },
    async track(id) {
      ensure(uuid(id), "Pedido inválido.");
      return store.transaction(async (tx) => {
        const o = await tx.getOrder(id);
        ensure(o, "Pedido não encontrado.", 404);
        return {
          number: o.ticket.number,
          status: o.status,
          ticketStatus: o.ticket.status,
          createdAt: o.createdAt,
          completedAt: o.completedAt,
          ahead:
            o.ticket.status === "PENDING"
              ? (await tx.listOrders()).filter(
                  (p) =>
                    p.ticket.status === "PENDING" &&
                    p.ticket.number < o.ticket.number,
                ).length
              : 0,
        };
      });
    },
    async register(body) {
      ensure(uuid(body.idempotencyKey), "Identificador do pedido inválido.");
      ensure(
        typeof body.inPerson === "boolean",
        "Escolha presencial inválida.",
      );
      ensure(
        Array.isArray(body.items) &&
          body.items.length > 0 &&
          body.items.length <= 50,
        "Selecione de 1 a 50 itens.",
      );
      const seen = new Set();
      const items = body.items
        .map((i) => {
          ensure(
            i && typeof i.cutId === "string" && ["kg", "un"].includes(i.unit),
            "Item inválido.",
          );
          const key = `${i.cutId}:${i.unit}`;
          ensure(!seen.has(key), "Item repetido.");
          seen.add(key);
          return {
            cutId: i.cutId,
            unit: i.unit,
            quantity: quantity(i.quantity, i.unit),
          };
        })
        .sort((a, b) =>
          `${a.cutId}:${a.unit}`.localeCompare(`${b.cutId}:${b.unit}`),
        );
      const requestHash = createHash("sha256")
        .update(JSON.stringify({ items, inPerson: body.inPerson }))
        .digest("hex");
      return store.transaction(async (tx) => {
        const previous = await tx.findOrder(body.idempotencyKey);
        if (previous) {
          ensure(
            previous.requestHash === requestHash,
            "Este identificador já foi usado para outra seleção.",
            409,
          );
          return { order: publicOrder(previous), replayed: true };
        }
        ensure(
          isOpen(await tx.getSettings(), now()),
          "Estamos fora do horário de atendimento.",
          409,
        );
        const cuts = await tx.listCuts();
        for (const item of items) {
          const c = cuts.find(
            (c) => c.id === item.cutId && c.active && c.available,
          );
          ensure(
            c && c.units.includes(item.unit),
            "Um corte foi alterado ou está indisponível. Atualize o cardápio.",
            409,
          );
          Object.assign(item, {
            name: c.name,
            priceCents: c.priceCents,
            subtotalCents: Math.floor(
              (Math.round(item.quantity * 1000) * c.priceCents + 500) / 1000,
            ),
          });
        }
        const order = await tx.insertOrder(
          createOrder({
            idempotencyKey: body.idempotencyKey,
            requestHash,
            inPerson: body.inPerson,
            items,
          }),
        );
        return { order: publicOrder(order), replayed: false };
      });
    },
    async dashboard(actor) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor);
        const orders = (await tx.listOrders()).map(publicOrder),
          groups = [];
        for (const o of orders.filter((o) => o.ticket.status !== "EXPIRED"))
          for (const i of o.items) {
            let g = groups.find(
              (g) => g.cutId === i.cutId && g.unit === i.unit,
            );
            if (!g) {
              g = {
                cutId: i.cutId,
                name: i.name,
                unit: i.unit,
                quantity: 0,
                tickets: [],
              };
              groups.push(g);
            }
            g.quantity = Math.round((g.quantity + i.quantity) * 1000) / 1000;
            g.tickets.push(o.ticket.number);
          }
        return { orders, groups, settings: await tx.getSettings() };
      });
    },
    async display() {
      return store.transaction(async (tx) => {
        const orders = await tx.listOrders();
        return {
          current: orders
            .filter((o) => o.ticket.status === "CALLED")
            .map((o) => ({
              number: o.ticket.number,
              lastCallAt: o.ticket.lastCallAt,
            }))
            .sort((a, b) => b.lastCallAt.localeCompare(a.lastCallAt)),
          waiting: orders
            .filter((o) => o.ticket.status === "PENDING")
            .map((o) => o.ticket.number),
          history: await tx.calls(),
          displaySeconds: (await tx.getSettings()).ticketDisplaySeconds,
        };
      });
    },
    async next(actor) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor);
        const order = (await tx.listOrders()).find(
          (o) => o.ticket.status === "PENDING",
        );
        ensure(order, "Não há senhas aguardando.", 409);
        return call(tx, order, actor, "MANUAL");
      });
    },
    async reissue(actor, id) {
      ensure(uuid(id), "Pedido inválido.");
      return store.transaction(async (tx) => {
        await authorize(tx, actor);
        const o = await tx.getOrder(id);
        ensure(
          o && o.ticket.status === "CALLED",
          "Senha não está em atendimento.",
          409,
        );
        ensure(
          o.ticket.reissueCount < (await tx.getSettings()).maxReissues,
          "Limite de reemissões atingido.",
          409,
        );
        return call(tx, o, actor, "REISSUE");
      });
    },
    async complete(actor, id) {
      ensure(uuid(id), "Pedido inválido.");
      return store.transaction(async (tx) => {
        await authorize(tx, actor);
        const o = await tx.getOrder(id);
        ensure(o, "Pedido não encontrado.", 404);
        if (o.status === "COMPLETED") return publicOrder(o);
        ensure(
          o.ticket.status === "CALLED",
          "Chame a senha antes de concluir.",
          409,
        );
        o.status = "COMPLETED";
        o.completedAt = now().toISOString();
        o.ticket.status = "FINISHED";
        return publicOrder(await tx.saveOrder(o));
      });
    },
    async restore(actor, id) {
      ensure(uuid(id), "Pedido inválido.");
      return store.transaction(async (tx) => {
        await authorize(tx, actor);
        const o = await tx.getOrder(id);
        ensure(
          o?.ticket.status === "EXPIRED",
          "A senha não está expirada.",
          409,
        );
        o.ticket.status = "PENDING";
        o.status = "REGISTERED";
        o.assignedTo = null;
        return publicOrder(await tx.saveOrder(o));
      });
    },
    async tick() {
      return store.transaction(async (tx) => {
        const s = await tx.getSettings();
        if (!s.automaticCalls || !isOpen(s, now())) return;
        const orders = await tx.listOrders(),
          called = orders.filter((o) => o.ticket.status === "CALLED");
        if (called.length) {
          for (const o of called) {
            if (
              now() - new Date(o.ticket.lastCallAt) <
              s.ticketDisplaySeconds * 1000
            )
              continue;
            if (o.ticket.reissueCount < s.maxReissues)
              await call(tx, o, null, "REISSUE");
            else {
              o.ticket.status = "EXPIRED";
              await tx.saveOrder(o);
            }
          }
          return;
        }
        const o = orders.find((o) => o.ticket.status === "PENDING");
        if (o) await call(tx, o, null, "AUTOMATIC");
      });
    },
    async admin(actor) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor, true);
        return {
          cuts: await tx.listCuts(),
          users: (await tx.listUsers()).map(publicUser),
          settings: await tx.getSettings(),
        };
      });
    },
    async saveCut(actor, id, body) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor, true);
        const previous = id
          ? (await tx.listCuts()).find((c) => c.id === id)
          : null;
        ensure(!id || previous, "Corte não encontrado.", 404);
        ensure(
          Array.isArray(body.units) &&
            body.units.length > 0 &&
            body.units.length <= 2 &&
            new Set(body.units).size === body.units.length &&
            body.units.every((u) => ["kg", "un"].includes(u)),
          "Unidades inválidas.",
        );
        ensure(
          typeof body.available === "boolean",
          "Disponibilidade inválida.",
        );
        const c = {
          id: id ?? randomUUID(),
          name: text(body.name, "Nome", 100),
          category: text(body.category, "Categoria", 80),
          description:
            typeof body.description === "string" ? body.description.trim() : "",
          priceCents: integer(body.priceCents, 0, 10000000, "Preço"),
          units: body.units,
          available: body.available,
          active: true,
        };
        ensure(c.description.length <= 1000, "Descrição muito longa.");
        return tx.saveCut(c);
      });
    },
    async removeCut(actor, id) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor, true);
        const c = (await tx.listCuts()).find((c) => c.id === id);
        ensure(c, "Corte não encontrado.", 404);
        return tx.saveCut({ ...c, active: false });
      });
    },
    async saveUser(actor, id, body) {
      ensure(!id || uuid(id), "Usuário inválido.");
      const passwordHash = body.password
        ? await hashPassword(body.password)
        : null;
      return store.transaction(async (tx) => {
        await authorize(tx, actor, true);
        const previous = id ? await tx.getUser(id) : null;
        ensure(!id || previous, "Usuário não encontrado.", 404);
        const email = text(body.email, "E-mail", 200).toLowerCase();
        ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "E-mail inválido.");
        ensure(
          ["MANAGER", "EMPLOYEE"].includes(body.role) &&
            typeof body.active === "boolean",
          "Perfil inválido.",
        );
        const users = await tx.listUsers();
        ensure(
          !users.some((u) => u.id !== id && u.email.toLowerCase() === email),
          "E-mail já cadastrado.",
          409,
        );
        ensure(
          !(
            previous?.role === "MANAGER" &&
            previous.active &&
            (!body.active || body.role !== "MANAGER") &&
            users.filter((u) => u.active && u.role === "MANAGER").length === 1
          ),
          "Mantenha pelo menos um gerente ativo.",
          409,
        );
        ensure(
          passwordHash || previous?.passwordHash,
          "Informe a senha do novo usuário.",
        );
        return publicUser(
          await tx.saveUser({
            id: id ?? randomUUID(),
            name: text(body.name, "Nome", 100),
            email,
            role: body.role,
            active: body.active,
            passwordHash: passwordHash ?? previous.passwordHash,
          }),
        );
      });
    },
    async saveSettings(actor, body) {
      return store.transaction(async (tx) => {
        await authorize(tx, actor, true);
        integer(body.ticketDisplaySeconds, 1, 3600, "Intervalo");
        integer(body.maxReissues, 0, 100, "Limite de reemissões");
        ensure(
          typeof body.automaticCalls === "boolean",
          "Modo de chamada inválido.",
        );
        ensure(
          Array.isArray(body.hours) && body.hours.length === 7,
          "Configure os 7 dias da semana.",
        );
        const seen = new Set();
        const hours = body.hours.map((h) => {
          integer(h.weekday, 0, 6, "Dia");
          ensure(
            !seen.has(h.weekday) && typeof h.isClosed === "boolean",
            "Dia repetido ou inválido.",
          );
          seen.add(h.weekday);
          const valid = (t) =>
            typeof t === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t);
          ensure(
            h.isClosed ||
              (valid(h.opensAt) && valid(h.closesAt) && h.opensAt < h.closesAt),
            "Horário inválido. O fechamento deve ser posterior à abertura.",
          );
          return {
            weekday: h.weekday,
            isClosed: h.isClosed,
            opensAt: h.isClosed ? null : h.opensAt,
            closesAt: h.isClosed ? null : h.closesAt,
          };
        });
        return tx.saveSettings(
          {
            timezone: "America/Sao_Paulo",
            hours,
            ticketDisplaySeconds: body.ticketDisplaySeconds,
            maxReissues: body.maxReissues,
            automaticCalls: body.automaticCalls,
          },
          actor.id,
        );
      });
    },
  };
}
