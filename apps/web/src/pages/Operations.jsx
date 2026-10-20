import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Clock3,
  Beef,
  TriangleAlert,
  Check,
  Search,
  CheckCircle2,
  RotateCcw,
  Volume2,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { api } from "../api.js";
import { money, number, normalize, waitingTime } from "../format.js";
import Clock from "../components/Clock.jsx";
import Modal from "../components/Modal.jsx";
export default function Operations({ onExpired }) {
  const [data, setData] = useState(null),
    [connectionError, setConnectionError] = useState(""),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("ALL"),
    [query, setQuery] = useState(""),
    [completing, setCompleting] = useState(null),
    [updated, setUpdated] = useState(null);
  const expired = useRef(onExpired),
    request = useRef(0),
    running = useRef(true);
  expired.current = onExpired;
  async function load() {
    const id = ++request.current;
    try {
      const d = await api("/operations");
      if (running.current && id === request.current) {
        setData(d);
        setUpdated(new Date());
        setConnectionError("");
      }
    } catch (e) {
      if (running.current && id === request.current) {
        setConnectionError(
          "Não foi possível atualizar a fila. Verifique a conexão.",
        );
        if (e.status === 401) expired.current();
      }
    }
  }
  useEffect(() => {
    running.current = true;
    load();
    const timer = setInterval(load, 3000);
    return () => {
      running.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  async function action(path, kind) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const { order } = await api(path, "POST", {});
      setCompleting(null);
      setNotice(
        kind === "complete"
          ? `Senha ${number(order.ticket.number)} concluída. Bom atendimento!`
          : kind === "restore"
            ? `Senha ${number(order.ticket.number)} voltou à fila.`
            : `Chamando a senha ${number(order.ticket.number)}.`,
      );
      await load();
    } catch (e) {
      setActionError(e.message);
      if (e.status === 401) expired.current();
    } finally {
      setBusy(false);
    }
  }
  const orders = data?.orders ?? [],
    counts = {
      ALL: orders.length,
      PENDING: orders.filter((o) => o.ticket.status === "PENDING").length,
      CALLED: orders.filter((o) => o.ticket.status === "CALLED").length,
      EXPIRED: orders.filter((o) => o.ticket.status === "EXPIRED").length,
    };
  const visible = orders.filter(
    (o) =>
      (filter === "ALL" || o.ticket.status === filter) &&
      normalize(
        `${number(o.ticket.number)} ${o.orderNumber} ${o.items.map((i) => i.name).join(" ")}`,
      ).includes(normalize(query)),
  );
  return (
    <main tabIndex={-1} className="operations">
      <div className="ops-heading page-heading">
        <div>
          <p className="eyebrow">PAINEL DA EQUIPE</p>
          <h1>O balcão está com você.</h1>
          <p>Acompanhe a fila e organize cada pedido, do preparo à entrega.</p>
        </div>
        <Clock />
      </div>
      <div className="ops-metrics" aria-label="Monitoramento da fila">
        {[
          {
            name: "Aguardando na fila",
            value: counts.PENDING,
            icon: Clock3,
            style: "amber",
            hint: "Por ordem de chegada",
          },
          {
            name: "Em atendimento",
            value: counts.CALLED,
            icon: BellRing,
            style: "wine",
            hint: "Senhas chamadas ao balcão",
          },
          {
            name: "Cortes em preparo",
            value: data?.groups.length ?? 0,
            icon: Beef,
            style: "green",
            hint: "Agrupados por corte e unidade",
          },
          {
            name: "Senhas expiradas",
            value: counts.EXPIRED,
            icon: TriangleAlert,
            style: "neutral",
            hint: "Aguardam orientação da equipe",
          },
        ].map(({ name, value, icon: Icon, style, hint }) => (
          <div className={`metric-card ${style}`} key={name}>
            <span className="metric-icon">
              <Icon size={19} />
            </span>
            <span>{name}</span>
            <strong>{data ? value : "—"}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      <div className="queue-action-bar">
        <div>
          <span
            className={`status-dot ${connectionError ? "is-offline" : ""}`}
          />
          <span>
            {connectionError
              ? "Atualização interrompida"
              : data?.settings.automaticCalls
                ? "Chamadas automáticas ativadas"
                : "Você controla as chamadas"}
            <small>
              {updated
                ? `Última atualização às ${updated.toLocaleTimeString("pt-BR")}`
                : "Buscando pedidos…"}
            </small>
          </span>
        </div>
        <a
          href="#/painel"
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          Abrir painel de senhas <ArrowRight size={14} />
        </a>
        <button
          className="primary"
          disabled={busy || !!connectionError || !counts.PENDING}
          onClick={() => action("/calls/next", "next")}
        >
          <BellRing size={17} />
          {busy ? "Aguarde…" : "Chamar próxima senha"}
        </button>
      </div>
      {connectionError && (
        <p role="alert" className="ops-alert">
          {connectionError}
          <button className="text-button" onClick={load}>
            Tentar novamente
          </button>
        </p>
      )}
      {actionError && !completing && (
        <p role="alert" className="ops-alert">
          {actionError}
        </p>
      )}
      {notice && (
        <p className="ops-success" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </p>
      )}
      <div className="queue-layout">
        <section className="queue-orders">
          <div className="queue-list-heading">
            <div>
              <h2>Pedidos do balcão</h2>
              <p>Cada cliente tem a sua vez.</p>
            </div>
            <span className="count-tag">{orders.length} pedidos</span>
          </div>
          <div className="order-controls">
            <div className="order-filters" aria-label="Filtrar pedidos">
              {[
                ["ALL", "Todos"],
                ["PENDING", "Na fila"],
                ["CALLED", "Em atendimento"],
                ["EXPIRED", "Expiradas"],
              ].map(([key, name]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  className={filter === key ? "active" : ""}
                  onClick={() => setFilter(key)}
                >
                  {name}
                  <small>{counts[key]}</small>
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Buscar pedido"
                placeholder="Buscar senha ou corte"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {!data && !connectionError && (
            <div
              className="loading-layout"
              role="status"
              aria-label="Carregando pedidos"
            >
              <div />
              <div />
            </div>
          )}
          <div className="order-grid">
            {visible.map((o) => (
              <article
                className={`order-card order-${o.ticket.status.toLowerCase()}`}
                key={o.id}
              >
                <div className="order-card-top">
                  <div className="order-number">
                    <span>SENHA</span>
                    <strong>{number(o.ticket.number)}</strong>
                  </div>
                  <span
                    className={`status-pill ${o.ticket.status.toLowerCase()}`}
                  >
                    <i />
                    {o.ticket.status === "EXPIRED"
                      ? "Expirada"
                      : o.ticket.status === "CALLED"
                        ? "Em atendimento"
                        : "Na fila"}
                  </span>
                </div>
                <div className="order-meta">
                  <span>
                    <Clock3 size={12} />
                    {waitingTime(o.createdAt)}
                  </span>
                  <span>Pedido #{o.orderNumber}</span>
                </div>
                {o.inPerson && (
                  <div className="in-person-note">
                    <Beef size={15} />
                    <span>Cliente vai escolher a peça no balcão.</span>
                  </div>
                )}
                <ul className="order-items">
                  {o.items.map((i) => (
                    <li key={`${i.cutId}:${i.unit}`}>
                      <strong>{i.name}</strong>
                      <span>
                        {i.quantity.toLocaleString("pt-BR")} {i.unit}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="order-estimate">
                  <span>Total estimado</span>
                  <strong>{money(o.totalCents)}</strong>
                </div>
                {o.ticket.status === "PENDING" && (
                  <p className="pending-order-hint">
                    <Clock3 size={13} />
                    Aguardando a próxima chamada
                  </p>
                )}
                {o.ticket.status === "EXPIRED" && (
                  <div className="expired-order-help">
                    <p>Cliente voltou? Recoloque a mesma senha na fila.</p>
                    <button
                      className="secondary"
                      disabled={busy || !!connectionError}
                      onClick={() =>
                        action(`/orders/${o.id}/restore`, "restore")
                      }
                    >
                      <RotateCcw size={15} />
                      Recolocar na fila
                    </button>
                  </div>
                )}
                {o.ticket.status === "CALLED" && (
                  <div className="ops-actions">
                    <button
                      className="secondary"
                      disabled={
                        busy ||
                        !!connectionError ||
                        o.ticket.reissueCount >= data.settings.maxReissues
                      }
                      title={
                        o.ticket.reissueCount >= data.settings.maxReissues
                          ? "Limite de reemissões atingido"
                          : undefined
                      }
                      onClick={() =>
                        action(`/orders/${o.id}/reissue`, "reissue")
                      }
                    >
                      <Volume2 size={15} />
                      Rechamar{" "}
                      <small>
                        {o.ticket.reissueCount}/{data.settings.maxReissues}
                      </small>
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !!connectionError}
                      onClick={() => {
                        setActionError("");
                        setCompleting(o);
                      }}
                    >
                      Concluir <Check size={16} />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {data && !visible.length && (
            <div className="empty-state queue-empty">
              <CheckCircle2 size={40} />
              <h3>
                {orders.length
                  ? "Nenhum pedido nessa seleção."
                  : "Fila em dia, balcão tranquilo."}
              </h3>
              <p>
                {orders.length
                  ? "Tente outro filtro ou busque por uma senha."
                  : "Os novos pedidos aparecem aqui automaticamente."}
              </p>
              {orders.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setFilter("ALL");
                  }}
                >
                  Mostrar todos os pedidos
                </button>
              )}
            </div>
          )}
        </section>
        <aside className="preparation-panel">
          <div className="preparation-heading">
            <span className="section-icon">
              <ClipboardList size={20} />
            </span>
            <h2>De olho no preparo</h2>
            <p>O que precisa sair do balcão.</p>
          </div>
          {data?.groups.length ? (
            <ul className="preparation-groups">
              {data.groups.map((g) => (
                <li key={`${g.cutId}:${g.unit}`}>
                  <div>
                    <strong>{g.name}</strong>
                    <b>
                      {g.quantity.toLocaleString("pt-BR")}{" "}
                      <small>{g.unit}</small>
                    </b>
                  </div>
                  <span>Senhas {g.tickets.map(number).join(" · ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="preparation-empty">
              <Beef size={40} strokeWidth={1} />
              <p>Nenhum corte em preparo.</p>
              <small>Os itens dos próximos pedidos serão agrupados aqui.</small>
            </div>
          )}
          <p className="preparation-foot">
            <Clock3 size={13} />A fila respeita a ordem de chegada.
          </p>
        </aside>
      </div>
      {completing && (
        <Modal
          title={`Concluir a senha ${number(completing.ticket.number)}?`}
          eyebrow="ATENDIMENTO NO PONTO"
          onClose={() => !busy && setCompleting(null)}
        >
          <p className="modal-description">
            Confira se os itens foram entregues ao cliente. Ao concluir, este
            pedido sai da fila e do preparo.
          </p>
          <ul className="completion-list">
            {completing.items.map((i) => (
              <li key={`${i.cutId}:${i.unit}`}>
                <Check size={14} />
                {i.quantity.toLocaleString("pt-BR")} {i.unit} de {i.name}
              </li>
            ))}
          </ul>
          {actionError && (
            <p className="ops-alert" role="alert">
              {actionError}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setCompleting(null)}
            >
              Voltar ao pedido
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                action(`/orders/${completing.id}/complete`, "complete")
              }
            >
              {busy ? "Concluindo…" : "Concluir atendimento"}
              <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
