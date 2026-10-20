import { useEffect, useState } from "react";
import {
  Ticket,
  Check,
  Clock3,
  BellRing,
  CheckCircle2,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";
import { api } from "../api.js";
import { number } from "../format.js";
export default function Tracking({ id }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      timer;
    async function load() {
      try {
        const d = await api(`/orders/${encodeURIComponent(id)}/status`);
        if (active) {
          setData(d);
          setError("");
          if (d.status === "COMPLETED") clearInterval(timer);
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    load();
    timer = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);
  const done = data?.status === "COMPLETED",
    called = data?.ticketStatus === "CALLED",
    expired = data?.ticketStatus === "EXPIRED",
    step = done ? 3 : called ? 2 : 1;
  return (
    <main tabIndex={-1} className="tracking-page">
      <div className="tracking-intro">
        <span>
          <Ticket size={22} />
        </span>
        <p className="eyebrow">SEU PEDIDO NO PONTO</p>
        <h1>Cada cliente tem a sua vez.</h1>
        <p>Acompanhe seu atendimento sem perder a tranquilidade.</p>
      </div>
      {error && (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="state">Buscando sua senha…</p>}
      {data && (
        <article className={`tracking-card ${expired ? "expired" : ""}`}>
          <div className="tracking-status">
            {done ? (
              <CheckCircle2 size={17} />
            ) : called ? (
              <BellRing size={17} />
            ) : expired ? (
              <TriangleAlert size={17} />
            ) : (
              <Clock3 size={17} />
            )}
            <span>
              {done
                ? "Atendimento concluído"
                : called
                  ? "Sua senha foi chamada"
                  : expired
                    ? "Senha expirada"
                    : "Pedido recebido · aguardando sua vez"}
            </span>
          </div>
          <p className="tracking-number-label">SUA SENHA</p>
          <strong className="tracking-number">{number(data.number)}</strong>
          <h2>
            {done
              ? "Obrigado pela preferência."
              : called
                ? "O balcão espera por você."
                : expired
                  ? "Vamos ajudar você."
                  : "Pode deixar com a gente."}
          </h2>
          <p>
            {done
              ? "Atendimento concluído. Obrigado!"
              : called
                ? "Dirija-se ao balcão para escolher e retirar seus cortes."
                : expired
                  ? "Procure um funcionário para recolocar sua senha na fila."
                  : "Seu pedido já está na fila de atendimento."}
          </p>
          {!expired && (
            <ol className="tracking-progress">
              {["Recebido", "Na fila", "No balcão", "Concluído"].map(
                (label, i) => (
                  <li key={label} className={i <= step ? "reached" : ""}>
                    <span>
                      {done || i < step ? <Check size={13} /> : i + 1}
                    </span>
                    <small>{label}</small>
                  </li>
                ),
              )}
            </ol>
          )}
          {data.ticketStatus === "PENDING" && (
            <div className="tracking-ahead">
              <Clock3 size={18} />
              <span>
                <strong>
                  {data.ahead === 0
                    ? "Você está no início da fila."
                    : `${data.ahead} ${data.ahead === 1 ? "senha aguarda" : "senhas aguardam"} antes da sua.`}
                </strong>
                <small>
                  A posição pode mudar conforme o andamento do balcão.
                </small>
              </span>
            </div>
          )}
          <a className="primary" href="#/painel">
            Ver painel de senhas <ArrowRight size={16} />
          </a>
        </article>
      )}
    </main>
  );
}
