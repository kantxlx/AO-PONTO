import { useEffect, useState } from "react";
import {
  Beef,
  Store,
  Monitor,
  ClipboardList,
  Settings,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import Catalog from "./App.jsx";
import Login from "./pages/Login.jsx";
import Display from "./pages/Display.jsx";
import Operations from "./pages/Operations.jsx";
import Administration from "./pages/Administration.jsx";
import Tracking from "./pages/Tracking.jsx";
import { api } from "./api.js";
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
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route, user?.id]);
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
  const links = [
    { href: "#/", label: "Cardápio", icon: Store },
    { href: "#/painel", label: "Painel de senhas", icon: Monitor },
    { href: "#/atendimento", label: "Atendimento", icon: ClipboardList },
    ...(user?.role === "MANAGER"
      ? [{ href: "#/admin", label: "Administração", icon: Settings }]
      : []),
  ];
  return (
    <>
      <a
        href="#conteudo"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector("main")?.focus();
        }}
      >
        Ir para o conteúdo
      </a>
      <div className="utility-strip">
        <span>AÇOUGUE & AUTOATENDIMENTO</span>
        <span>Da sua escolha ao nosso balcão.</span>
      </div>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="Ao Ponto início">
          <span className="brand-icon">
            <Beef size={25} strokeWidth={1.5} />
          </span>
          <span>
            ao
            <span className="brand-point">
              ponto<span>.</span>
            </span>
            <small>TRADIÇÃO EM CADA CORTE</small>
          </span>
        </a>
        <nav aria-label="Áreas do sistema" className="app-navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={route === href ? "is-active" : ""}
              aria-current={route === href ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <span className="avatar">{user.name.charAt(0)}</span>
              <span className="account-name">
                {user.name}
                <small>
                  {user.role === "MANAGER" ? "Gerência" : "Equipe do balcão"}
                </small>
              </span>
              <button
                className="icon-button"
                onClick={logout}
                aria-label="Sair da conta"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <span className="header-service">
              <span className="status-dot" />
              Atendimento por senha
            </span>
          )}
        </div>
      </header>
      {notice && (
        <div className="global-notice" role="alert">
          {notice}
        </div>
      )}
      {route.startsWith("#/pedido/") ? (
        <Tracking id={route.slice(9)} />
      ) : route === "#/painel" ? (
        <Display />
      ) : protectedRoute ? (
        checking ? (
          <main tabIndex={-1} className="operations">
            <p className="state">Verificando acesso…</p>
          </main>
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
      <footer className="site-footer">
        <a href="#/" className="footer-brand">
          ao ponto<span>.</span>
        </a>
        <span>Boa escolha. Bom atendimento. No ponto.</span>
        <a href="#/atendimento">
          Área da equipe <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
