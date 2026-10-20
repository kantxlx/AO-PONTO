import { useEffect, useState } from "react";
import Catalog from "./App.jsx";
import { api } from "./api.js";
import "./operations.css";
const money = (n) =>
  (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (n) => String(n).padStart(3, "0");
const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
export default function Shell() {
  const [route, setRoute] = useState(location.hash || "#/"),
    [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const update = () => {
      setRoute(location.hash || "#/");
      setNotice("");
    };
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  const protectedRoute = ["#/atendimento", "#/admin"].includes(route);
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      setUser(null);
      location.hash = "#/";
    } catch (e) {
      setNotice(e.message);
    }
  }
  return (
    <>
      <nav className="app-navigation" aria-label="Áreas do sistema">
        <a href="#/">Cardápio</a>
        <a href="#/painel">Painel de senhas</a>
        <a href="#/atendimento">Atendimento</a>
        {user?.role === "MANAGER" && <a href="#/admin">Administração</a>}
        {user && (
          <>
            <span>{user.name}</span>
            <button onClick={logout}>Sair</button>
          </>
        )}
      </nav>
      {notice && (
        <p role="alert" className="ops-alert">
          {notice}
        </p>
      )}
      {route.startsWith("#/pedido/") ? (
        <Tracking id={route.slice(9)} />
      ) : route === "#/painel" ? (
        <Display />
      ) : protectedRoute ? (
        checking ? (
          <p className="state">Verificando acesso…</p>
        ) : !user ? (
          <Login onLogin={setUser} />
        ) : route === "#/admin" ? (
          <Administration user={user} onExpired={() => setUser(null)} />
        ) : (
          <Operations onExpired={() => setUser(null)} />
        )
      ) : (
        <Catalog />
      )}
    </>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="operations">
      <form
        className="ops-card login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            onLogin(
              (await api("/auth/login", "POST", { email, password })).user,
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">AO PONTO · EQUIPE</p>
        <h1>Acesso da equipe</h1>
        <p>Entre para organizar os pedidos e o atendimento.</p>
        <label>
          E-mail
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="ops-alert" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
function Display() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const stream = new EventSource("/api/events");
    stream.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data);
        if (active) {
          setData(snapshot);
          setError("");
        }
      } catch {}
    };
    stream.addEventListener("unavailable", () => {
      if (active)
        setError("Servidor temporariamente indisponível. Tentando reconectar.");
    });
    stream.onerror = () => {
      if (active) setError("Reconectando ao painel…");
    };
    async function load() {
      try {
        const d = await api("/display");
        if (active) {
          setData(d);
          setError("");
        }
      } catch {
        if (active)
          setError(
            "Sem conexão. As senhas exibidas podem estar desatualizadas.",
          );
      }
    }
    load();
    const t = setInterval(() => {
      if (stream.readyState !== EventSource.OPEN) load();
    }, 2000);
    return () => {
      active = false;
      stream.close();
      clearInterval(t);
    };
  }, []);
  const current = data?.current[0];
  return (
    <main className="operations display">
      <p className="eyebrow">AO PONTO · ATENDIMENTO</p>
      <h1>Painel de senhas</h1>
      {error && (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      )}
      <section className="display-current" aria-live="polite">
        <span>
          {current ? "Senha em atendimento" : "Aguarde a próxima chamada"}
        </span>
        <strong>{current ? number(current.number) : "—"}</strong>
        <p>Dirija-se ao balcão quando sua senha for chamada.</p>
      </section>
      <section className="ops-card">
        <h2>Últimas chamadas</h2>
        <div className="ticket-strip">
          {data?.history.map((h, i) => (
            <span key={`${h.calledAt}:${i}`}>
              {number(h.number)}
              <small>
                {new Date(h.calledAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {h.type === "REISSUE" ? " · repetição" : ""}
              </small>
            </span>
          ))}
          {data && !data.history.length && <p>Nenhuma chamada registrada.</p>}
        </div>
        <h2>Aguardando</h2>
        <p>
          {data?.waiting.map(number).join(" · ") || "Nenhuma senha na fila."}
        </p>
      </section>
    </main>
  );
}
function Operations({ onExpired }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api("/operations"));
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.status === 401) onExpired();
    }
  }
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const d = await api("/operations");
        if (active) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e.message);
          if (e.status === 401) onExpired();
        }
      }
    }
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  async function action(path) {
    setBusy(true);
    setNotice("");
    try {
      const { order } = await api(path, "POST", {});
      setNotice(`Senha ${number(order.ticket.number)} atualizada.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="operations">
      <div className="ops-heading">
        <div>
          <p className="eyebrow">BALCÃO</p>
          <h1>Atendimento</h1>
          <p>
            Fila por ordem de chegada.{" "}
            {data?.settings.automaticCalls
              ? "Chamadas automáticas ativadas."
              : "Chamadas manuais."}
          </p>
        </div>
        <button
          className="primary"
          disabled={
            busy ||
            !!error ||
            !data?.orders.some((o) => o.ticket.status === "PENDING")
          }
          onClick={() => action("/calls/next")}
        >
          Chamar próxima senha
        </button>
      </div>
      {error && (
        <p role="alert" className="ops-alert">
          {error} <button onClick={load}>Atualizar</button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {data && (
        <section className="ops-metrics" aria-label="Monitoramento da fila">
          <div>
            Na fila
            <strong>
              {data.orders.filter((o) => o.ticket.status === "PENDING").length}
            </strong>
          </div>
          <div>
            Em atendimento
            <strong>
              {data.orders.filter((o) => o.ticket.status === "CALLED").length}
            </strong>
          </div>
          <div>
            Expiradas
            <strong>
              {data.orders.filter((o) => o.ticket.status === "EXPIRED").length}
            </strong>
          </div>
          <div>
            Cortes em preparo<strong>{data.groups.length}</strong>
          </div>
        </section>
      )}
      <section className="ops-card">
        <h2>Preparo por corte</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Corte</th>
                <th>Quantidade</th>
                <th>Senhas</th>
              </tr>
            </thead>
            <tbody>
              {data?.groups.map((g) => (
                <tr key={`${g.cutId}:${g.unit}`}>
                  <td>{g.name}</td>
                  <td>
                    {g.quantity.toLocaleString("pt-BR")} {g.unit}
                  </td>
                  <td>{g.tickets.map(number).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && !data.groups.length && <p>Nenhum item pendente.</p>}
      </section>
      <div className="order-grid">
        {data?.orders.map((o) => (
          <article className="ops-card" key={o.id}>
            <div className="ops-heading">
              <h2>Senha {number(o.ticket.number)}</h2>
              <span className="status-pill">
                {o.ticket.status === "EXPIRED"
                  ? "Senha expirada"
                  : o.status === "REGISTERED"
                    ? "Na fila"
                    : "Em atendimento"}
              </span>
            </div>
            <p>
              {new Date(o.createdAt).toLocaleString("pt-BR")} · Pedido{" "}
              {o.orderNumber}
            </p>
            {o.inPerson && (
              <p className="ops-alert">
                Cliente quer escolher a peça no balcão.
              </p>
            )}
            <ul>
              {o.items.map((i) => (
                <li key={`${i.cutId}:${i.unit}`}>
                  {i.quantity.toLocaleString("pt-BR")} {i.unit} · {i.name}
                </li>
              ))}
            </ul>
            <p>
              Estimativa: <strong>{money(o.totalCents)}</strong>
            </p>
            {o.ticket.status === "EXPIRED" && (
              <button
                disabled={busy || !!error}
                onClick={() => action(`/orders/${o.id}/restore`)}
              >
                Recolocar na fila
              </button>
            )}
            {o.ticket.status === "CALLED" && (
              <div className="ops-actions">
                <button
                  disabled={
                    busy ||
                    !!error ||
                    o.ticket.reissueCount >= data.settings.maxReissues
                  }
                  onClick={() => action(`/orders/${o.id}/reissue`)}
                >
                  Rechamar ({o.ticket.reissueCount}/{data.settings.maxReissues})
                </button>
                <button
                  className="primary"
                  disabled={busy || !!error}
                  onClick={() => action(`/orders/${o.id}/complete`)}
                >
                  Concluir atendimento
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {data && !data.orders.length && (
        <p className="state">Tudo em dia. Nenhum pedido pendente.</p>
      )}
    </main>
  );
}
const emptyCut = {
  name: "",
  category: "Bovinos",
  description: "",
  priceCents: 0,
  units: ["kg"],
  available: true,
};
const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
  active: true,
};
function Administration({ user, onExpired }) {
  const [data, setData] = useState(null),
    [cut, setCut] = useState(null),
    [account, setAccount] = useState(null),
    [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [removing, setRemoving] = useState(null);
  async function load() {
    try {
      const d = await api("/admin");
      setData(d);
      setSettings(d.settings);
    } catch (e) {
      setError(e.message);
      if (e.status === 401) onExpired();
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(path, method, body, done = () => {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, method, body);
      done();
      setNotice("Alterações salvas.");
      await load();
    } catch (e) {
      setError(e.message);
      if (e.status === 401) onExpired();
    } finally {
      setBusy(false);
    }
  }
  if (user.role !== "MANAGER")
    return (
      <main className="operations">
        <h1>Acesso restrito ao gerente</h1>
      </main>
    );
  return (
    <main className="operations">
      <p className="eyebrow">GERÊNCIA</p>
      <h1>Administração</h1>
      {error && (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className="ops-card">
        <div className="ops-heading">
          <h2>Catálogo de cortes</h2>
          <button
            className="primary"
            onClick={() => {
              setCut({ ...emptyCut });
              setRemoving(null);
            }}
          >
            Cadastrar corte
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Corte</th>
                <th>Preço</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.cuts
                .filter((c) => c.active)
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name}
                      <small>
                        {c.category} · {c.units.join("/")}
                      </small>
                    </td>
                    <td>{money(c.priceCents)}</td>
                    <td>{c.available ? "Disponível" : "Indisponível"}</td>
                    <td>
                      <button onClick={() => setCut({ ...c })}>
                        Editar {c.name}
                      </button>{" "}
                      <button onClick={() => setRemoving(c)}>
                        Desativar {c.name}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {removing && (
          <div className="ops-alert">
            <p>
              Desativar {removing.name}? Os pedidos anteriores serão
              preservados.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                save(`/admin/cuts/${removing.id}`, "DELETE", {}, () =>
                  setRemoving(null),
                )
              }
            >
              Confirmar desativação
            </button>{" "}
            <button onClick={() => setRemoving(null)}>Cancelar</button>
          </div>
        )}
        {cut && (
          <form
            className="ops-form"
            onSubmit={(e) => {
              e.preventDefault();
              save(
                `/admin/cuts${cut.id ? "/" + cut.id : ""}`,
                cut.id ? "PUT" : "POST",
                cut,
                () => setCut(null),
              );
            }}
          >
            <h3>{cut.id ? "Editar corte" : "Novo corte"}</h3>
            <label>
              Nome
              <input
                required
                maxLength={100}
                value={cut.name}
                onChange={(e) => setCut({ ...cut, name: e.target.value })}
              />
            </label>
            <label>
              Categoria
              <input
                required
                maxLength={80}
                value={cut.category}
                onChange={(e) => setCut({ ...cut, category: e.target.value })}
              />
            </label>
            <label>
              Descrição
              <textarea
                maxLength={1000}
                value={cut.description}
                onChange={(e) =>
                  setCut({ ...cut, description: e.target.value })
                }
              />
            </label>
            <label>
              Preço (R$)
              <input
                type="number"
                required
                min="0"
                max="100000"
                step="0.01"
                value={cut.priceCents / 100}
                onChange={(e) =>
                  setCut({
                    ...cut,
                    priceCents: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </label>
            <fieldset>
              <legend>Unidades permitidas</legend>
              {["kg", "un"].map((u) => (
                <label key={u}>
                  <input
                    type="checkbox"
                    checked={cut.units.includes(u)}
                    onChange={(e) =>
                      setCut({
                        ...cut,
                        units: e.target.checked
                          ? [...cut.units, u]
                          : cut.units.filter((v) => v !== u),
                      })
                    }
                  />
                  {u}
                </label>
              ))}
            </fieldset>
            <label>
              <input
                type="checkbox"
                checked={cut.available}
                onChange={(e) =>
                  setCut({ ...cut, available: e.target.checked })
                }
              />
              Disponível
            </label>
            <div className="ops-actions">
              <button className="primary" disabled={busy}>
                Salvar corte
              </button>
              <button type="button" onClick={() => setCut(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="ops-card">
        <div className="ops-heading">
          <h2>Equipe</h2>
          <button onClick={() => setAccount({ ...emptyUser })}>
            Cadastrar usuário
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === "MANAGER" ? "Gerente" : "Funcionário"}
                    {!u.active ? " · inativo" : ""}
                  </td>
                  <td>
                    <button onClick={() => setAccount({ ...u, password: "" })}>
                      Editar usuário {u.name}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {account && (
          <form
            className="ops-form"
            onSubmit={(e) => {
              e.preventDefault();
              save(
                `/admin/users${account.id ? "/" + account.id : ""}`,
                account.id ? "PUT" : "POST",
                account,
                () => {
                  setAccount(null);
                  if (account.id === user.id) onExpired();
                },
              );
            }}
          >
            <h3>{account.id ? "Editar usuário" : "Novo usuário"}</h3>
            <label>
              Nome
              <input
                required
                maxLength={100}
                value={account.name}
                onChange={(e) =>
                  setAccount({ ...account, name: e.target.value })
                }
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                required
                value={account.email}
                onChange={(e) =>
                  setAccount({ ...account, email: e.target.value })
                }
              />
            </label>
            <label>
              Senha {account.id ? "(deixe em branco para manter)" : ""}
              <input
                type="password"
                autoComplete="new-password"
                required={!account.id}
                minLength={10}
                maxLength={128}
                value={account.password}
                onChange={(e) =>
                  setAccount({ ...account, password: e.target.value })
                }
              />
            </label>
            <label>
              Perfil
              <select
                value={account.role}
                onChange={(e) =>
                  setAccount({ ...account, role: e.target.value })
                }
              >
                <option value="EMPLOYEE">Funcionário</option>
                <option value="MANAGER">Gerente</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={account.active}
                onChange={(e) =>
                  setAccount({ ...account, active: e.target.checked })
                }
              />
              Ativo
            </label>
            <p>
              Alterações encerram as sessões desse usuário. Deve existir pelo
              menos um gerente ativo.
            </p>
            <div className="ops-actions">
              <button className="primary" disabled={busy}>
                Salvar usuário
              </button>
              <button type="button" onClick={() => setAccount(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
      {settings && (
        <form
          className="ops-card ops-form"
          onSubmit={(e) => {
            e.preventDefault();
            save("/admin/settings", "PUT", settings);
          }}
        >
          <h2>Horários e chamadas</h2>
          <p>
            Fuso: America/Sao_Paulo. Fora do expediente, o cardápio continua
            visível e novos pedidos ficam bloqueados.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Fechado</th>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                </tr>
              </thead>
              <tbody>
                {settings.hours.map((h, index) => (
                  <tr key={h.weekday}>
                    <td>{days[h.weekday]}</td>
                    <td>
                      <input
                        aria-label={`${days[h.weekday]} fechado`}
                        type="checkbox"
                        checked={h.isClosed}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hours: settings.hours.map((v, i) =>
                              i === index
                                ? {
                                    ...v,
                                    isClosed: e.target.checked,
                                    opensAt: v.opensAt || "08:00",
                                    closesAt: v.closesAt || "18:00",
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                    </td>
                    {["opensAt", "closesAt"].map((key) => (
                      <td key={key}>
                        <input
                          aria-label={`${days[h.weekday]} ${key === "opensAt" ? "abertura" : "fechamento"}`}
                          type="time"
                          required={!h.isClosed}
                          disabled={h.isClosed}
                          value={h[key] || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              hours: settings.hours.map((v, i) =>
                                i === index
                                  ? { ...v, [key]: e.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label>
            Intervalo entre chamadas (segundos)
            <input
              type="number"
              required
              min="1"
              max="3600"
              value={settings.ticketDisplaySeconds}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ticketDisplaySeconds: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Máximo de reemissões
            <input
              type="number"
              required
              min="0"
              max="100"
              value={settings.maxReissues}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxReissues: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.automaticCalls}
              onChange={(e) =>
                setSettings({ ...settings, automaticCalls: e.target.checked })
              }
            />
            Chamadas automáticas
          </label>
          <p>
            No modo automático, após o intervalo a chamada é repetida até o
            limite; depois a senha expira e a fila avança. Conclua o atendimento
            antes do prazo ou mantenha o modo manual durante o preparo.
          </p>
          <button className="primary" disabled={busy}>
            Salvar configurações
          </button>
        </form>
      )}
    </main>
  );
}
function Tracking({ id }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const d = await api(`/orders/${encodeURIComponent(id)}/status`);
        if (active) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id]);
  const message =
    data?.ticketStatus === "EXPIRED"
      ? "Sua senha expirou. Procure um funcionário no balcão."
      : data?.status === "COMPLETED"
        ? "Atendimento concluído. Obrigado!"
        : data?.ticketStatus === "CALLED"
          ? "Sua senha foi chamada. Dirija-se ao balcão."
          : "Seu pedido está na fila.";
  return (
    <main className="operations display">
      <p className="eyebrow">AO PONTO · SEU PEDIDO</p>
      <h1>Acompanhe sua senha</h1>
      {error && (
        <p className="ops-alert" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <section className="display-current" aria-live="polite">
            <span>{message}</span>
            <strong>{number(data.number)}</strong>
          </section>
          {data.ticketStatus === "PENDING" && (
            <p>
              {data.ahead} senha(s) aguardando antes da sua. A quantidade pode
              mudar conforme o atendimento.
            </p>
          )}
        </>
      )}
      <a href="#/painel">Ver painel de senhas</a>
    </main>
  );
}
