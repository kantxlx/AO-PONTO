import { useEffect, useState } from "react";
import {
  Beef,
  Users,
  Clock3,
  Plus,
  Search,
  Pencil,
  Archive,
  RotateCcw,
  Check,
  ArrowRight,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api.js";
import { money, days, normalize, priceFromInput } from "../format.js";
import CutPhoto from "../components/CutPhoto.jsx";
import Modal from "../components/Modal.jsx";
import Clock from "../components/Clock.jsx";
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
export default function Administration({ user, onExpired }) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("cuts"),
    [cut, setCut] = useState(null),
    [account, setAccount] = useState(null),
    [removing, setRemoving] = useState(null),
    [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [archive, setArchive] = useState(false);
  async function load() {
    try {
      const d = await api("/admin");
      setData(d);
      setSettings(d.settings);
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.status === 401) onExpired();
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  async function save(path, method, body, done = () => {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, method, body);
      done();
      setNotice("Tudo certo. Alterações salvas.");
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      if (e.status === 401) onExpired();
      return false;
    } finally {
      setBusy(false);
    }
  }
  const openCut = (value) => {
    setError("");
    setCut({ ...value, units: [...value.units] });
  };
  const openUser = (value) => {
    setError("");
    setAccount({ ...value, password: "" });
  };
  if (user.role !== "MANAGER")
    return (
      <main tabIndex={-1} className="operations">
        <div className="state">
          <ShieldCheck size={36} />
          <h1>Acesso da gerência</h1>
          <p>Esta área é exclusiva para o gerente do açougue.</p>
          <a href="#/atendimento" className="primary">
            Voltar ao atendimento
          </a>
        </div>
      </main>
    );
  const cuts =
    data?.cuts.filter(
      (c) =>
        Boolean(c.active) !== archive &&
        normalize(`${c.name} ${c.category}`).includes(normalize(query)),
    ) ?? [];
  return (
    <main tabIndex={-1} className="operations administration">
      <div className="ops-heading page-heading">
        <div>
          <p className="eyebrow">GESTÃO DO AÇOUGUE</p>
          <h1>Administração</h1>
          <p>Seu catálogo, sua equipe e a rotina do balcão.</p>
        </div>
        <Clock />
      </div>
      <nav className="section-tabs" aria-label="Seções da administração">
        {[
          { id: "cuts", name: "Cortes do cardápio", icon: Beef },
          { id: "users", name: "Sua equipe", icon: Users },
          { id: "settings", name: "Horários e fila", icon: Clock3 },
        ].map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </nav>
      {error && !cut && !account && !removing && (
        <p role="alert" className="ops-alert">
          {error}{" "}
          <button className="text-button" onClick={load}>
            Tentar novamente
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="ops-success">
          <Check size={17} />
          {notice}
        </p>
      )}
      {!data && !error && (
        <div
          className="loading-layout"
          aria-label="Carregando administração"
          role="status"
        >
          <div />
          <div />
          <div />
        </div>
      )}
      {tab === "cuts" && data && (
        <section className="ops-card admin-card">
          <div className="ops-heading card-heading">
            <div>
              <h2>Seus cortes, bem apresentados.</h2>
              <p>Atualize os produtos que aparecem para seus clientes.</p>
            </div>
            <button className="primary" onClick={() => openCut(emptyCut)}>
              <Plus size={16} />
              Cadastrar corte
            </button>
          </div>
          <div className="table-toolbar">
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Buscar corte na administração"
                placeholder="Buscar por nome ou categoria"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="segmented">
              <button
                aria-pressed={!archive}
                className={!archive ? "active" : ""}
                onClick={() => setArchive(false)}
              >
                No cardápio{" "}
                <small>{data.cuts.filter((c) => c.active).length}</small>
              </button>
              <button
                aria-pressed={archive}
                className={archive ? "active" : ""}
                onClick={() => setArchive(true)}
              >
                Arquivados{" "}
                <small>{data.cuts.filter((c) => !c.active).length}</small>
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Corte</th>
                  <th>Preço</th>
                  <th>Disponibilidade</th>
                  <th className="actions-cell">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cuts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="table-product">
                        <CutPhoto cut={c} />
                        <span>
                          <strong>{c.name}</strong>
                          <small>
                            {c.category} · {c.units.join(" / ")}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{money(c.priceCents)}</strong>
                      <small>por {c.units.join(" / ")}</small>
                    </td>
                    <td>
                      <span
                        className={`availability-pill ${c.available && c.active ? "available" : ""}`}
                      >
                        <i />
                        {!c.active
                          ? "Arquivado"
                          : c.available
                            ? "Disponível"
                            : "Indisponível"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="icon-button"
                        aria-label={
                          c.active ? `Editar ${c.name}` : `Reativar ${c.name}`
                        }
                        title={c.active ? "Editar corte" : "Reativar corte"}
                        onClick={() => openCut(c)}
                      >
                        {c.active ? (
                          <Pencil size={16} />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                      </button>
                      {c.active && (
                        <button
                          className="icon-button danger-icon"
                          aria-label={`Desativar ${c.name}`}
                          title="Arquivar corte"
                          onClick={() => {
                            setError("");
                            setRemoving(c);
                          }}
                        >
                          <Archive size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!cuts.length && (
            <div className="empty-state">
              <Beef size={32} />
              <h3>
                {query
                  ? "Nenhum corte por aqui."
                  : archive
                    ? "Nenhum corte arquivado."
                    : "Vamos montar seu cardápio?"}
              </h3>
              <p>
                {query
                  ? "Tente outro nome ou categoria."
                  : "Cadastre e organize os cortes do seu açougue."}
              </p>
            </div>
          )}
          <div className="table-foot">
            {cuts.length} {cuts.length === 1 ? "corte" : "cortes"}{" "}
            {archive ? "arquivados" : "no cardápio"}
            <span>Preços estimados para itens vendidos por peso.</span>
          </div>
        </section>
      )}
      {tab === "users" && data && (
        <section className="ops-card admin-card">
          <div className="ops-heading card-heading">
            <div>
              <h2>Gente boa no mesmo balcão.</h2>
              <p>Gerencie o acesso de quem cuida do atendimento.</p>
            </div>
            <button className="primary" onClick={() => openUser(emptyUser)}>
              <Plus size={16} />
              Cadastrar usuário
            </button>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th className="actions-cell">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-product">
                        <span className="avatar">{u.name.charAt(0)}</span>
                        <strong>
                          {u.name}
                          {u.id === user.id && <small>Você</small>}
                        </strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`role-pill ${u.role === "MANAGER" ? "manager" : ""}`}
                      >
                        {u.role === "MANAGER" ? (
                          <ShieldCheck size={13} />
                        ) : (
                          <Users size={13} />
                        )}{" "}
                        {u.role === "MANAGER" ? "Gerente" : "Funcionário"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`availability-pill ${u.active ? "available" : ""}`}
                      >
                        <i />
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="icon-button"
                        aria-label={`Editar usuário ${u.name}`}
                        onClick={() => openUser(u)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            {data.users.filter((u) => u.active).length} pessoas com acesso ativo
            <span>Somente gerentes podem administrar o sistema.</span>
          </div>
        </section>
      )}
      {tab === "settings" && settings && (
        <SettingsEditor
          settings={settings}
          setSettings={setSettings}
          busy={busy}
          onSave={() => save("/admin/settings", "PUT", settings)}
        />
      )}
      {cut && (
        <CutEditor
          key={cut.id ?? "new"}
          initial={cut}
          busy={busy}
          error={error}
          onClose={() => setCut(null)}
          onSave={(body) =>
            save(
              `/admin/cuts${cut.id ? "/" + cut.id : ""}`,
              cut.id ? "PUT" : "POST",
              body,
              () => setCut(null),
            )
          }
        />
      )}
      {account && (
        <UserEditor
          key={account.id ?? "new"}
          initial={account}
          busy={busy}
          error={error}
          onClose={() => setAccount(null)}
          onSave={(body) =>
            save(
              `/admin/users${account.id ? "/" + account.id : ""}`,
              account.id ? "PUT" : "POST",
              body,
              () => {
                setAccount(null);
                if (account.id === user.id) onExpired();
              },
            )
          }
        />
      )}
      {removing && (
        <Modal
          title={`Arquivar ${removing.name}?`}
          eyebrow="CUIDADO COM O CARDÁPIO"
          onClose={() => !busy && setRemoving(null)}
        >
          <p className="modal-description">
            Este corte deixa de aparecer no cardápio. Os pedidos anteriores
            continuam registrados, e você pode reativá-lo depois.
          </p>
          {error && (
            <p role="alert" className="ops-alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Manter no cardápio
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                save(`/admin/cuts/${removing.id}`, "DELETE", {}, () =>
                  setRemoving(null),
                )
              }
            >
              {busy ? "Arquivando…" : "Confirmar desativação"}
              <Archive size={15} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function CutEditor({ initial, onSave, onClose, error, busy }) {
  const [cut, setCut] = useState(initial),
    [price, setPrice] = useState(
      (initial.priceCents / 100).toFixed(2).replace(".", ","),
    ),
    [validation, setValidation] = useState("");
  const update = (key, value) => setCut((c) => ({ ...c, [key]: value }));
  return (
    <Modal
      title={
        initial.id
          ? initial.active
            ? "Editar corte"
            : "Reativar corte"
          : "Novo corte no cardápio"
      }
      eyebrow="CATÁLOGO DO AÇOUGUE"
      onClose={() => !busy && onClose()}
      wide
    >
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          setValidation("");
          try {
            onSave({ ...cut, priceCents: priceFromInput(price) });
          } catch (e) {
            setValidation(e.message);
          }
        }}
      >
        <div className="editor-photo">
          <CutPhoto cut={cut} />
          <p>
            A imagem é ilustrativa.
            <br />O nome e os detalhes aparecem no cardápio.
          </p>
        </div>
        <div className="form-grid">
          <label>
            Nome do corte
            <input
              required
              maxLength={100}
              placeholder="Ex.: Alcatra"
              value={cut.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            Categoria
            <input
              required
              maxLength={80}
              list="cut-categories"
              placeholder="Ex.: Bovinos"
              value={cut.category}
              onChange={(e) => update("category", e.target.value)}
            />
            <datalist id="cut-categories">
              <option value="Bovinos" />
              <option value="Suínos" />
              <option value="Aves" />
            </datalist>
          </label>
        </div>
        <label>
          Descrição
          <textarea
            maxLength={1000}
            rows={3}
            placeholder="Conte o que torna esse corte especial."
            value={cut.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Preço (R$)
            <input
              aria-label="Preço (R$)"
              required
              inputMode="decimal"
              placeholder="0,00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <small>Informe o valor por kg ou unidade.</small>
          </label>
          <fieldset>
            <legend>Como este corte é vendido?</legend>
            <div className="unit-checks">
              {["kg", "un"].map((unit) => (
                <label key={unit}>
                  <input
                    type="checkbox"
                    checked={cut.units.includes(unit)}
                    onChange={(e) =>
                      update(
                        "units",
                        e.target.checked
                          ? [...cut.units, unit]
                          : cut.units.filter((u) => u !== unit),
                      )
                    }
                  />
                  {unit === "kg" ? "Quilograma" : "Unidade"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <label className="check-option">
          <input
            type="checkbox"
            checked={cut.available}
            onChange={(e) => update("available", e.target.checked)}
          />
          <span>
            <strong>Disponível para pedidos</strong>
            <small>
              Desmarque quando o corte estiver temporariamente indisponível.
            </small>
          </span>
        </label>
        {(validation || error) && (
          <p role="alert" className="ops-alert">
            {validation || error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Salvando…"
              : initial.id
                ? "Salvar alterações"
                : "Cadastrar corte"}
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function UserEditor({ initial, onSave, onClose, error, busy }) {
  const [account, setAccount] = useState(initial);
  const update = (key, value) => setAccount((a) => ({ ...a, [key]: value }));
  return (
    <Modal
      title={
        account.id ? "Editar pessoa da equipe" : "Uma nova pessoa no balcão"
      }
      eyebrow="SUA EQUIPE"
      onClose={() => !busy && onClose()}
    >
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(account);
        }}
      >
        <label>
          Nome
          <input
            required
            maxLength={100}
            placeholder="Nome de quem vai usar o sistema"
            value={account.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            required
            maxLength={200}
            autoComplete="off"
            placeholder="pessoa@exemplo.com"
            value={account.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </label>
        <label>
          {account.id ? "Nova senha (opcional)" : "Senha de acesso"}
          <input
            type="password"
            autoComplete="new-password"
            required={!account.id}
            minLength={10}
            maxLength={128}
            placeholder={
              account.id
                ? "Deixe em branco para manter a atual"
                : "Pelo menos 10 caracteres"
            }
            value={account.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </label>
        <label>
          Perfil de acesso
          <select
            value={account.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="EMPLOYEE">
              Funcionário · atendimento e pedidos
            </option>
            <option value="MANAGER">
              Gerente · atendimento e administração
            </option>
          </select>
        </label>
        <label className="check-option">
          <input
            type="checkbox"
            checked={account.active}
            onChange={(e) => update("active", e.target.checked)}
          />
          <span>
            <strong>Acesso ativo</strong>
            <small>Usuários inativos não podem entrar no sistema.</small>
          </span>
        </label>
        <p className="field-help">
          Ao salvar alterações, essa pessoa precisará entrar novamente. Deve
          existir pelo menos um gerente ativo.
        </p>
        {error && (
          <p role="alert" className="ops-alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar usuário"}
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function SettingsEditor({ settings, setSettings, onSave, busy }) {
  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));
  const hour = (index, key, value) =>
    setSettings((s) => ({
      ...s,
      hours: s.hours.map((h, i) =>
        i === index
          ? {
              ...h,
              [key]: value,
              ...(key === "isClosed" && !value
                ? {
                    opensAt: h.opensAt || "08:00",
                    closesAt: h.closesAt || "18:00",
                  }
                : {}),
            }
          : h,
      ),
    }));
  return (
    <form
      className="settings-layout"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <section className="ops-card">
        <div className="card-heading">
          <span className="section-icon">
            <Clock3 size={20} />
          </span>
          <h2>O horário do seu balcão.</h2>
          <p>
            Fora do expediente, o cliente pode consultar o cardápio. Novos
            pedidos ficam bloqueados.
          </p>
        </div>
        <button
          type="button"
          className="text-button copy-hours"
          onClick={() => {
            const monday = settings.hours.find((h) => h.weekday === 1);
            setSettings((s) => ({
              ...s,
              hours: s.hours.map((h) =>
                h.weekday >= 1 && h.weekday <= 5
                  ? { ...monday, weekday: h.weekday }
                  : h,
              ),
            }));
          }}
        >
          Copiar segunda para dias úteis <ArrowRight size={13} />
        </button>
        <div className="hours-list">
          {settings.hours.map((h, index) => (
            <div
              className={`hours-row ${h.isClosed ? "closed" : ""}`}
              key={h.weekday}
            >
              <span>{days[h.weekday]}</span>
              <label className="closed-toggle">
                <input
                  type="checkbox"
                  aria-label={`${days[h.weekday]} fechado`}
                  checked={h.isClosed}
                  onChange={(e) => hour(index, "isClosed", e.target.checked)}
                />
                <span>Fechado</span>
              </label>
              <input
                type="time"
                required={!h.isClosed}
                disabled={h.isClosed}
                aria-label={`${days[h.weekday]} abertura`}
                value={h.opensAt || ""}
                onChange={(e) => hour(index, "opensAt", e.target.value)}
              />
              <span className="hour-separator">às</span>
              <input
                type="time"
                required={!h.isClosed}
                disabled={h.isClosed}
                aria-label={`${days[h.weekday]} fechamento`}
                value={h.closesAt || ""}
                onChange={(e) => hour(index, "closesAt", e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="field-help">
          Horário de Brasília · America/Sao_Paulo. A abertura e o fechamento
          devem ocorrer no mesmo dia.
        </p>
      </section>
      <section className="ops-card call-settings">
        <div className="card-heading">
          <span className="section-icon">
            <Settings2 size={20} />
          </span>
          <h2>Uma fila no ritmo certo.</h2>
          <p>Escolha como as senhas serão chamadas.</p>
        </div>
        <label className="check-option">
          <input
            type="checkbox"
            checked={settings.automaticCalls}
            onChange={(e) => update("automaticCalls", e.target.checked)}
          />
          <span>
            <strong>Chamadas automáticas</strong>
            <small>Desativado: a equipe controla cada chamada.</small>
          </span>
        </label>
        <label>
          Intervalo entre chamadas (segundos)
          <input
            type="number"
            required
            min="1"
            max="3600"
            value={settings.ticketDisplaySeconds}
            onChange={(e) =>
              update("ticketDisplaySeconds", Number(e.target.value))
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
            onChange={(e) => update("maxReissues", Number(e.target.value))}
          />
        </label>
        <div className="settings-note">
          <Clock3 size={18} />
          <p>
            No modo automático, a senha é repetida até o limite e depois expira.
            Para atendimentos demorados, prefira o modo manual.
          </p>
        </div>
        <button className="primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar configurações"}
          <Check size={16} />
        </button>
      </section>
    </form>
  );
}
