import { useEffect, useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Beef } from "lucide-react";
import { api } from "../api.js";
export default function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    api("/cuts")
      .then((d) => {
        if (active) setDemo(d.demo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <main tabIndex={-1} className="login-page">
      <div className="login-story">
        <div className="login-seal">
          <Beef size={30} />
          <span>
            AO PONTO<small>TRADIÇÃO & CUIDADO</small>
          </span>
        </div>
        <div>
          <p className="eyebrow">DO OUTRO LADO DO BALCÃO</p>
          <h1>
            Bom atendimento
            <br />
            começa com
            <br />
            <em>organização.</em>
          </h1>
          <p>
            Pedidos, equipe e cada detalhe
            <br />
            do seu açougue, no mesmo lugar.
          </p>
        </div>
        <span className="login-story-foot">
          Cada corte tem seu ponto. Cada cliente, sua vez.
        </span>
      </div>
      <section className="login-panel">
        <form
          className="login-form"
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
          <span className="login-lock">
            <ShieldCheck size={24} />
          </span>
          <p className="eyebrow">ÁREA DA EQUIPE</p>
          <h2>Bem-vindo ao balcão.</h2>
          <p>Entre com sua conta para continuar.</p>
          <label>
            E-mail
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                aria-label="Senha"
                required
                autoComplete="current-password"
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
          {error && (
            <p className="ops-alert" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Entrando…" : "Acessar minha conta"}
            <ArrowRight size={18} />
          </button>
          <p className="login-help">
            Ainda não tem acesso? Solicite seu cadastro ao gerente.
          </p>
          {demo && (
            <details className="demo-access">
              <summary>Testar com a conta de demonstração</summary>
              <p>Somente neste ambiente, use a conta com dados fictícios.</p>
              <button
                type="button"
                onClick={() => {
                  setEmail("gerente@demo.local");
                  setPassword("DemoAoPonto2026!");
                }}
              >
                Preencher acesso de demonstração
              </button>
            </details>
          )}
        </form>
      </section>
    </main>
  );
}
