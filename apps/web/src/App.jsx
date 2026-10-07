import { useEffect, useState } from "react";
import {
  Beef,
  Search,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Drumstick,
  X,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";
import { addItem, restoreCart, reconcileCart } from "./cart.js";
import { useRef } from "react";
const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export default function App() {
  //uc03
  const [registeringOrder, setRegisteringOrder] = useState(false);
  const [serviceTicket, setServiceTicket] = useState(null);

  async function submitOrder() {
    if (cart.length === 0) return;

    setRegisteringOrder(true);
    setServiceTicket(null);
    setNotice("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inPerson: true,
          items: cart.map((item) => ({
            cut: item.cutId,
            quantity: item.quantity,
            unitOfMeasure: item.unit,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível registrar o pedido.");
      }

      setServiceTicket(data.serviceTicket);
      setCart([]);
      setNotice("Pedido registrado com sucesso.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setRegisteringOrder(false);
    }
  }

  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [cart, setCart] = useState(() => {
    try {
      return restoreCart(localStorage.getItem("ao-ponto.selection.v1"));
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("kg");
  const [selectionError, setSelectionError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    try {
      localStorage.setItem("ao-ponto.selection.v1", JSON.stringify(cart));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [cart]);
  useEffect(() => {
    if (!selected) return;
    dialogRef.current.showModal();
    dialogRef.current.querySelector("input")?.focus();
  }, [selected]);
  function closeSelection() {
    dialogRef.current.close();
    setSelected(null);
    triggerRef.current?.focus();
  }
  function openSelection(cut, event) {
    triggerRef.current = event.currentTarget;
    setSelected(cut);
    setUnit(cut.units[0]);
    setQuantity("1");
    setSelectionError("");
  }
  function submitSelection(event) {
    event.preventDefault();
    try {
      setCart(addItem(cart, selected, quantity, unit));
      setNotice(`${selected.name} adicionado à seleção.`);
      closeSelection();
    } catch (err) {
      setSelectionError(err.message);
    }
  }
  function changeQuantity(item, direction) {
    const step = item.unit === "kg" ? 0.25 : 1;
    const next = Math.round((item.quantity + direction * step) * 1000) / 1000;
    if (next <= 0 || next > 100) return;
    setCart(
      cart.map((row) => (row === item ? { ...row, quantity: next } : row)),
    );
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/cuts", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Cardápio indisponível");
        return response.json();
      })
      .then((data) => {
        setCuts(data.cuts);
        setDemo(data.demo);
        setCart((previous) => {
          const next = reconcileCart(previous, data.cuts);
          if (next.length !== previous.length)
            setNotice(
              "Cortes que não estão mais disponíveis foram retirados da seleção.",
            );
          return next;
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError")
          setError(
            "Não conseguimos carregar o cardápio. Verifique a conexão e tente novamente.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const categories = ["Todos", ...new Set(cuts.map((cut) => cut.category))];
  const normalized = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visibleCuts = cuts.filter(
    (cut) =>
      (category === "Todos" || cut.category === category) &&
      normalized(cut.name).includes(normalized(search)),
  );
  const cartRows = cart
    .map((item) => ({
      ...item,
      cut: cuts.find((cut) => cut.id === item.cutId),
      original: item,
    }))
    .filter((item) => item.cut);
  const totalCents = cartRows.reduce(
    (total, item) => total + Math.round(item.cut.priceCents * item.quantity),
    0,
  );
  return (
    <div className="app">
      <header>
        <a className="brand" href="/" aria-label="Ao Ponto início">
          <span className="brand-icon">
            <Beef size={26} />
          </span>
          <span>
            ao<span className="brand-light">ponto</span>
            <small>AÇOUGUE · AUTOATENDIMENTO</small>
          </span>
        </a>
        <span className="header-note">
          <span className="dot" /> Feito para o seu dia a dia
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">DO NOSSO BALCÃO PARA SUA MESA</p>
            <h1>
              Seu próximo prato
              <br />
              começa <em>aqui.</em>
            </h1>
            <p className="subtitle">
              Escolha seus cortes favoritos.
              <br />A gente cuida do resto.
            </p>
          </div>
          <div className="intro-badge">
            <Beef size={50} strokeWidth={1.2} />
            <span>
              Cortes selecionados.
              <br />
              <strong>Sabor de verdade.</strong>
            </span>
          </div>
        </section>
        {demo && (
          <p className="demo-note">
            Demonstração · produtos e preços fictícios
          </p>
        )}
        <div className="catalog-layout">
          <section className="catalog" aria-label="Cardápio">
            <div className="catalog-tools">
              <div className="tabs" role="group" aria-label="Categorias">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? "active" : ""}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Buscar corte"
                  placeholder="Buscar um corte"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="section-heading">
              <h2>
                {category === "Todos" ? "Conheça nossos cortes" : category}
              </h2>
              <span>
                {loading
                  ? "Carregando…"
                  : `${visibleCuts.length} ${visibleCuts.length === 1 ? "opção" : "opções"}`}
              </span>
            </div>
            {loading ? (
              <p className="state" role="status">
                Preparando o cardápio…
              </p>
            ) : error ? (
              <div className="state" role="alert">
                <p>{error}</p>
                <button className="primary" onClick={() => setRetry(retry + 1)}>
                  <RefreshCw size={16} /> Tentar novamente
                </button>
              </div>
            ) : visibleCuts.length === 0 ? (
              <p className="state">
                Nenhum corte encontrado. Tente outra busca ou categoria.
              </p>
            ) : (
              <div className="grid">
                {visibleCuts.map((cut) => (
                  <article
                    className={`cut-card ${!cut.available ? "unavailable" : ""}`}
                    key={cut.id}
                  >
                    <div
                      className={`cut-art ${cut.category === "Aves" ? "poultry" : cut.category === "Suínos" ? "pork" : ""}`}
                    >
                      {cut.category === "Aves" ? (
                        <Drumstick size={78} strokeWidth={1} />
                      ) : (
                        <Beef size={88} strokeWidth={1} />
                      )}
                      <span className="category-label">{cut.category}</span>
                      {!cut.available && (
                        <span className="sold-out">Indisponível</span>
                      )}
                    </div>
                    <div className="cut-info">
                      <h3>{cut.name}</h3>
                      <p>{cut.description}</p>
                      <div className="cut-bottom">
                        <span className="price">
                          {money(cut.priceCents)}
                          <small>/{cut.units[0]}</small>
                        </span>
                        <button
                          className="select-cut"
                          disabled={!cut.available}
                          aria-label={`Selecionar ${cut.name}`}
                          onClick={(event) => openSelection(cut, event)}
                        >
                          <ArrowUpRight size={20} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className="cart" aria-label="Sua seleção">
            <div className="cart-heading">
              <h2>
                Sua seleção <small>({cart.length})</small>
              </h2>
              <ShoppingBag size={21} />
            </div>
            {loading || error ? (
              <p className="cart-message">
                A seleção estará disponível quando o cardápio carregar.
              </p>
            ) : cartRows.length === 0 ? (

              <>
                {serviceTicket !== null && (
                  <div className="service-ticket">
                    <strong>Sua senha</strong>
                    <span>{serviceTicket}</span>
                  </div>
                 )}

              <div className="empty-cart">
                <span>
                  <ShoppingBag size={36} strokeWidth={1.2} />
                </span>
                <h3>O que vai ser hoje?</h3>
                <p>
                  Adicione seus cortes favoritos.
                  <br />
                  Seu pedido começa aqui.
                </p>
              </div>
              </>
            ) : (
              <>
                <div className="cart-items">
                  {cartRows.map((item) => (
                    <div
                      className="cart-item"
                      key={`${item.cutId}:${item.unit}`}
                    >
                      <div className="cart-item-title">
                        <strong>{item.cut.name}</strong>
                        <button
                          className="icon-button"
                          aria-label={`Remover ${item.cut.name}`}
                          onClick={() =>
                            setCart(cart.filter((row) => row !== item.original))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="cart-item-bottom">
                        <div className="quantity-stepper">
                          <button
                            aria-label={`Diminuir ${item.cut.name}`}
                            disabled={
                              item.quantity <= (item.unit === "kg" ? 0.25 : 1)
                            }
                            onClick={() => changeQuantity(item.original, -1)}
                          >
                            <Minus size={13} />
                          </button>
                          <span>
                            {item.quantity.toLocaleString("pt-BR")} {item.unit}
                          </span>
                          <button
                            aria-label={`Aumentar ${item.cut.name}`}
                            disabled={
                              item.quantity + (item.unit === "kg" ? 0.25 : 1) >
                              100
                            }
                            onClick={() => changeQuantity(item.original, 1)}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span>
                          {money(
                            Math.round(item.cut.priceCents * item.quantity),
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div>
                    <span>Total estimado</span>
                    <strong>{money(totalCents)}</strong>
                  </div>
                  <p>O valor final depende do peso no balcão.</p>
                  <button
                    className="clear-cart"
                    onClick={() => {
                      setCart([]);
                      setNotice("Seleção limpa.");
                    }}
                  >
                    Limpar seleção
                  </button>
                  <button
                    className="primary"
                    onClick={submitOrder}
                    disabled={registeringOrder}
                  >
                    {registeringOrder
                      ? "Registrando pedido…"
                      : "Confirmar pedido"}
                  </button>
                </div>
              </>
            )}
            <div className="cart-footer">
              <span>Escolha com calma. Prepare com carinho.</span>
            </div>
          </aside>
        </div>
        <p role="status" className="selection-notice">
          {notice}
        </p>
        {storageWarning && (
          <p role="alert" className="demo-note">
            A seleção não pôde ser salva neste navegador. Ela será perdida ao
            fechar ou recarregar a página.
          </p>
        )}
        <dialog
          ref={dialogRef}
          onCancel={() => {
            setSelected(null);
            triggerRef.current?.focus();
          }}
          aria-labelledby="selection-title"
        >
          <form onSubmit={submitSelection}>
            <div className="dialog-heading">
              <p className="eyebrow">DO SEU JEITO</p>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar seleção"
                onClick={closeSelection}
              >
                <X size={22} />
              </button>
            </div>
            <h2 id="selection-title">{selected?.name}</h2>
            <p className="dialog-description">{selected?.description}</p>
            <p className="dialog-price">
              {selected && money(selected.priceCents)} / {unit}
            </p>
            <div className="selection-fields">
              <label>
                Quantidade
                <input
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-describedby="quantity-help"
                  required
                />
              </label>
              <label>
                Unidade
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  {selected?.units.map((value) => (
                    <option value={value} key={value}>
                      {value === "kg" ? "Quilogramas (kg)" : "Unidades (un)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p id="quantity-help" className="field-help">
              {unit === "kg"
                ? "Exemplo: 0,500 para meio quilo. Limite: 100 kg."
                : "Informe uma quantidade inteira, de 1 a 100."}
            </p>
            {selectionError && (
              <p role="alert" className="form-error">
                {selectionError}
              </p>
            )}
            <button className="primary add-selection" type="submit">
              <Plus size={18} /> Adicionar à seleção
            </button>
          </form>
        </dialog>
      </main>
      <footer>
        <span>
          ao ponto <span className="footer-dot">·</span> Cada corte, uma boa
          escolha.
        </span>
        <span>Autoatendimento</span>
      </footer>
    </div>
  );
}
