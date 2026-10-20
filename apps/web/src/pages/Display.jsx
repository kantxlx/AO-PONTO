import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  BellRing,
  Clock3,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api } from "../api.js";
import { number } from "../format.js";
import Clock from "../components/Clock.jsx";
export default function Display() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [sound, setSound] = useState(false),
    [full, setFull] = useState(false);
  const audio = useRef(null),
    soundRef = useRef(false),
    previous = useRef(null);
  function chime() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      if (!audio.current) audio.current = new Context();
      audio.current.resume();
      const ctx = audio.current,
        start = ctx.currentTime;
      [659.25, 880].forEach((frequency, index) => {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start + index * 0.2);
        gain.gain.linearRampToValueAtTime(0.12, start + index * 0.2 + 0.03);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          start + index * 0.2 + 0.5,
        );
        osc.start(start + index * 0.2);
        osc.stop(start + index * 0.2 + 0.55);
      });
    } catch {
      setError("O som não está disponível neste navegador.");
    }
  }
  useEffect(() => {
    let active = true;
    const stream = new EventSource("/api/events");
    const accept = (d) => {
      if (active) {
        setData(d);
        setError("");
      }
    };
    stream.onmessage = (e) => {
      try {
        accept(JSON.parse(e.data));
      } catch {}
    };
    stream.addEventListener("unavailable", () => {
      if (active) setError("Tentando restabelecer a conexão com o balcão.");
    });
    stream.onerror = () => {
      if (active) setError("Reconectando ao balcão…");
    };
    async function load() {
      try {
        accept(await api("/display"));
      } catch {
        if (active)
          setError("Sem conexão. As informações podem estar desatualizadas.");
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
      audio.current?.close().catch(() => {});
      audio.current = null;
    };
  }, []);
  const current = data?.current[0],
    stamp = current ? `${current.number}:${current.lastCallAt}` : null;
  useEffect(() => {
    if (stamp && stamp !== previous.current && soundRef.current) chime();
    previous.current = stamp;
  }, [stamp]);
  useEffect(() => {
    const update = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return (
    <main tabIndex={-1} className="display-page">
      <div className="display-top">
        <div>
          <p className="eyebrow">AO PONTO · NO SEU TEMPO</p>
          <h1>Painel de senhas</h1>
          <p>Fique à vontade. A gente avisa quando for sua vez.</p>
        </div>
        <Clock />
      </div>
      <div className="public-display-layout">
        <section className="display-current" aria-live="polite">
          <span className="display-bell">
            <BellRing size={24} />
          </span>
          <span className="display-label">
            {current ? "ESTAMOS CHAMANDO" : "SEU ATENDIMENTO COMEÇA AQUI"}
          </span>
          <strong key={stamp}>{current ? number(current.number) : "—"}</strong>
          <h2>{current ? "É a sua vez." : "Aguarde a próxima chamada."}</h2>
          <p>
            {current
              ? "Dirija-se ao balcão para o seu atendimento."
              : "Sua senha aparecerá aqui quando for chamada."}
          </p>
          <div className="display-current-foot">
            <span className="status-dot" />
            Atendimento por ordem de chegada
          </div>
        </section>
        <aside className="display-history">
          <div className="display-section-heading">
            <Clock3 size={20} />
            <h2>Últimas chamadas</h2>
          </div>
          <div className="ticket-history">
            {data?.history.slice(0, 5).map((h, i) => (
              <div
                key={`${h.calledAt}:${i}`}
                className={i === 0 ? "latest" : ""}
              >
                <span>
                  <small>SENHA</small>
                  <strong>{number(h.number)}</strong>
                </span>
                <span>
                  {h.type === "REISSUE" ? "Rechamada" : "Chamada"}
                  <small>
                    {new Date(h.calledAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
              </div>
            ))}
            {data && !data.history.length && (
              <p className="display-no-history">
                As chamadas aparecerão aqui assim que o atendimento começar.
              </p>
            )}
          </div>
          <div className="display-waiting">
            <h3>
              Aguardando a vez <span>{data?.waiting.length ?? 0}</span>
            </h3>
            <div>
              {data?.waiting.slice(0, 12).map((n) => (
                <span key={n}>{number(n)}</span>
              ))}
              {data && !data.waiting.length && <p>Nenhuma senha aguardando.</p>}
            </div>
          </div>
        </aside>
      </div>
      <div className="display-bottom">
        <span
          className={error ? "display-connection error" : "display-connection"}
        >
          {error ? <WifiOff size={15} /> : <Wifi size={15} />}
          <span role={error ? "alert" : undefined}>
            {error || "Conectado ao balcão · atualização automática"}
          </span>
        </span>
        <div>
          <button
            aria-pressed={sound}
            onClick={() => {
              soundRef.current = !sound;
              setSound(!sound);
              if (!sound) chime();
            }}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}{" "}
            {sound ? "Som ativado" : "Ativar som"}
          </button>
          <button
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await document.documentElement.requestFullscreen();
              } catch {
                setError("Use F11 para abrir o painel em tela cheia.");
              }
            }}
          >
            {full ? <Minimize size={16} /> : <Maximize size={16} />}{" "}
            {full ? "Sair da tela cheia" : "Tela cheia"}
          </button>
        </div>
      </div>
    </main>
  );
}
