import { useEffect, useState } from "react";
import {
  Beef,
  Search,
  RefreshCw,
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Check,
  ShieldCheck,
  Clock3,
  ReceiptText,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import {
  addItem,
  restoreCart,
  reconcileCart,
  subtotalCents,
  parseQuantity,
} from "./cart.js";
import { useRef } from "react";
import OrderSuccess from "./components/OrderSuccess.jsx";
import CutPhoto from "./components/CutPhoto.jsx";
function readReceipt() {
  try {
    const data = JSON.parse(sessionStorage.getItem("ao-ponto.receipt"));
    return data?.id &&
      Number.isInteger(data?.ticket?.number) &&
      data.kioskExpiresAt > Date.now()
      ? data
      : null;
  } catch {
    return null;
  }
}
const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export default function App() {
  const [registeringOrder, setRegisteringOrder] = useState(false);
  const [receipt, setReceipt] = useState(readReceipt);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [stage, setStage] = useState("catalog");
  const [editingItem, setEditingItem] = useState(null);
  const stageHeading = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (stage === "cart") stageHeading.current?.focus();
  }, [stage]);
  useEffect(() => {
    try {
      if (receipt)
        sessionStorage.setItem("ao-ponto.receipt", JSON.stringify(receipt));
      else sessionStorage.removeItem("ao-ponto.receipt");
    } catch {}
  }, [receipt]);
  const [inPerson, setInPerson] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ao-ponto.pending-order"));
    } catch {
      return null;
    }
  });
  const [businessStatus, setBusinessStatus] = useState(null);
  const submitting = useRef(false),
    submitLatest = useRef(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const reconnect = () => {
      setOffline(false);
      if (localStorage.getItem("ao-ponto.pending-order"))
        submitLatest.current?.();
    };
    const disconnect = () => setOffline(true);
    addEventListener("online", reconnect);
    addEventListener("offline", disconnect);
    if (pendingOrder && navigator.onLine) reconnect();
    const timer = setInterval(() => {
      if (navigator.onLine && localStorage.getItem("ao-ponto.pending-order"))
        submitLatest.current?.();
    }, 10000);
    return () => {
      clearInterval(timer);
      removeEventListener("online", reconnect);
      removeEventListener("offline", disconnect);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/status")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((s) => {
          if (active) setBusinessStatus(s);
        })
        .catch(() => {
          if (active) setBusinessStatus(null);
        });
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  async function submitOrder() {
    if (submitting.current) return;
    if (cart.length === 0 && !pendingOrder) return;
    submitting.current = true;
    setRegisteringOrder(true);
    setNotice("");

    try {
      const request = pendingOrder ?? {
        idempotencyKey: crypto.randomUUID(),
        inPerson,
        items: cart.map(({ cutId, quantity, unit }) => ({
          cutId,
          quantity,
          unit,
        })),
      };
      localStorage.setItem("ao-ponto.pending-order", JSON.stringify(request));
      setPendingOrder(request);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          localStorage.removeItem("ao-ponto.pending-order");
          setPendingOrder(null);
        }
        throw new Error(
          data.message ||
            "Não foi possível registrar o pedido. Tente novamente para recuperar a mesma senha.",
        );
      }

      setReceipt({ ...data.order, kioskExpiresAt: Date.now() + 30000 });
      setStage("catalog");
      localStorage.setItem("ao-ponto.selection.v1", "[]");
      localStorage.removeItem("ao-ponto.pending-order");
      setPendingOrder(null);
      setInPerson(false);
      setCart([]);
      setNotice("Pedido registrado com sucesso.");
    } catch (error) {
      setNotice(
        error instanceof TypeError || !navigator.onLine
          ? "Pedido salvo neste navegador, aguardando conexão. A senha só será emitida após confirmação do servidor."
          : error.message,
      );
    } finally {
      submitting.current = false;
      setRegisteringOrder(false);
    }
  }
  submitLatest.current = submitOrder;

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
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!receipt) return;
    let active = true;
    fetch(`/api/orders/${encodeURIComponent(receipt.id)}/status`)
      .then((r) => {
        if (active && r.status === 404) {
          setReceipt(null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [receipt?.id]);
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
    setEditingItem(null);
    setReceipt(null);
    triggerRef.current = event.currentTarget;
    setSelected(cut);
    setUnit(cut.units[0]);
    setQuantity("1");
    setSelectionError("");
  }
  function submitSelection(event) {
    event.preventDefault();
    try {
      const base = editingItem
        ? cart.filter(
            (row) =>
              !(
                row.cutId === editingItem.cutId && row.unit === editingItem.unit
              ),
          )
        : cart;
      setCart(addItem(base, selected, quantity, unit));
      setNotice(
        editingItem
          ? "Quantidade atualizada."
          : `${selected.name} adicionado ao pedido.`,
      );
      closeSelection();
    } catch (err) {
      setSelectionError(err.message);
    }
  }
  function changeQuantity(item, direction) {
    if (pendingOrder || registeringOrder) return;
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
      (!onlyAvailable || cut.available) &&
      normalized(cut.name + " " + cut.description).includes(normalized(search)),
  );
  if (sort === "price-up")
    visibleCuts.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "price-down")
    visibleCuts.sort((a, b) => b.priceCents - a.priceCents);
  if (sort === "name")
    visibleCuts.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  let selectionSubtotal = null;
  try {
    if (selected)
      selectionSubtotal = subtotalCents(
        selected.priceCents,
        parseQuantity(quantity, unit),
      );
  } catch {}
  const cartRows = cart
    .map((item) => ({
      ...item,
      cut: cuts.find((cut) => cut.id === item.cutId),
      original: item,
    }))
    .filter((item) => item.cut);
  const totalCents = cartRows.reduce(
    (total, item) => total + subtotalCents(item.cut.priceCents, item.quantity),
    0,
  );
  function startNewOrder() {
    setReceipt(null);
    setCart([]);
    setInPerson(false);
    setStage("catalog");
    setSearch("");
    setCategory("Todos");
    setOnlyAvailable(false);
    setSort("recommended");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => document.getElementById("conteudo")?.focus());
  }
  return (
    <div className={`app kiosk-app stage-${stage}`}>
      <main id="conteudo" tabIndex={-1} className="catalog-main">
        <section className="intro" aria-label="Bem-vindo ao Ao Ponto">
          <div className="intro-copy">
            <span className="hero-label">
              <span />
              TRADIÇÃO EM CADA ESCOLHA
            </span>
            <h1>
              Carne boa.
              <br />
              <em>Do seu jeito.</em>
            </h1>
            <p>
              Escolha seus cortes, receba sua senha
              <br />e deixe o resto com o nosso balcão.
            </p>
            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById("catalogo")
                  .scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Escolher meus cortes <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-stamp">
            <Beef size={25} strokeWidth={1.3} />
            <span>
              AO PONTO<small>DO BALCÃO À SUA MESA</small>
            </span>
          </div>
        </section>
        <div className="how-it-works" aria-label="Como pedir">
          <span>
            <b>01</b> Escolha os cortes
          </span>
          <span>
            <b>02</b> Revise no carrinho
          </span>
          <span>
            <b>03</b> Receba sua senha
          </span>
          <small>
            <ShieldCheck size={16} />
            Prático, no seu tempo.
          </small>
        </div>
        {offline && (
          <p role="alert" className="demo-note">
            Sem conexão · catálogo em cache. A confirmação ficará pendente até a
            reconexão.
          </p>
        )}
        {businessStatus && !businessStatus.open && (
          <p className="demo-note" role="status">
            Fora do horário de atendimento. Você pode consultar o cardápio.
          </p>
        )}
        {pendingOrder && (
          <div className="demo-note" role="alert">
            Há uma confirmação pendente. Use o botão para recuperar a mesma
            senha.{" "}
            <button
              className="primary"
              disabled={registeringOrder}
              onClick={submitOrder}
            >
              Tentar confirmar novamente
            </button>
          </div>
        )}
        <div className="catalog-layout">
          <section id="catalogo" className="catalog" aria-label="Cardápio">
            <div className="catalog-title">
              <div>
                <p className="eyebrow">ESCOLHA COM GOSTO</p>
                <h2>Nosso cardápio</h2>
              </div>
              <span>
                {demo ? "Demonstração · " : ""}
                {cuts.length} cortes para escolher
              </span>
            </div>
            <div className="catalog-tools">
              <div className="tabs" role="group" aria-label="Categorias">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? "active" : ""}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}{" "}
                    <small>
                      {item === "Todos"
                        ? cuts.length
                        : cuts.filter((c) => c.category === item).length}
                    </small>
                  </button>
                ))}
              </div>
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Buscar corte"
                  placeholder="Qual corte você procura?"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="catalog-filters">
              <label className="availability-filter">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                Somente disponíveis
              </label>
              <label className="sort-control">
                <SlidersHorizontal size={14} />
                <select
                  aria-label="Ordenar cortes"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recommended">Ordem do cardápio</option>
                  <option value="price-up">Menor preço</option>
                  <option value="price-down">Maior preço</option>
                  <option value="name">Nome do corte</option>
                </select>
              </label>
            </div>
            <div className="section-heading">
              <h2>{category === "Todos" ? "Todos os cortes" : category}</h2>
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
                <button
                  className="text-button"
                  onClick={() => {
                    setSearch("");
                    setCategory("Todos");
                    setOnlyAvailable(false);
                  }}
                >
                  Limpar filtros
                </button>
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
                      <CutPhoto cut={cut} />
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
                          disabled={
                            !cut.available || !!pendingOrder || registeringOrder
                          }
                          aria-label={`Selecionar ${cut.name}`}
                          onClick={(event) => openSelection(cut, event)}
                        >
                          <Plus size={15} /> <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="kiosk-checkout" aria-label="Carrinho">
            <button
              className="secondary checkout-back"
              onClick={() => setStage("catalog")}
            >
              ← Continuar escolhendo
            </button>
            <p className="eyebrow">CONFIRA ANTES DE ENVIAR</p>
            <h1 ref={stageHeading} tabIndex={-1}>
              Seu carrinho
            </h1>
            <p className="checkout-description">
              Confira os cortes e as quantidades. Ao finalizar, seu pedido será
              enviado ao açougue.
            </p>
            <aside className="cart kiosk-cart" aria-label="Itens do carrinho">
              <div className="cart-heading">
                <h2>
                  <ReceiptText size={21} /> Seu pedido{" "}
                  <small>{cart.length}</small>
                </h2>
              </div>
              {loading || error ? (
                <p className="cart-message">
                  A seleção estará disponível quando o cardápio carregar.
                </p>
              ) : cartRows.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingBag size={36} />
                  <h3>Seu carrinho está vazio.</h3>
                  <p>Escolha seus cortes para começar.</p>
                  <button
                    className="primary"
                    onClick={() => setStage("catalog")}
                  >
                    Escolher cortes <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cartRows.map((item) => (
                      <div
                        className="cart-item"
                        key={`${item.cutId}:${item.unit}`}
                      >
                        <div className="cart-item-title">
                          <div className="cart-product">
                            <CutPhoto cut={item.cut} />
                            <strong>
                              {item.cut.name}
                              <small>
                                {money(item.cut.priceCents)}/{item.unit}
                              </small>
                            </strong>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`Remover ${item.cut.name}`}
                            disabled={!!pendingOrder || registeringOrder}
                            onClick={() =>
                              setCart(
                                cart.filter((row) => row !== item.original),
                              )
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
                                !!pendingOrder ||
                                registeringOrder ||
                                item.quantity <= (item.unit === "kg" ? 0.25 : 1)
                              }
                              onClick={() => changeQuantity(item.original, -1)}
                            >
                              <Minus size={13} />
                            </button>
                            <button
                              className="edit-quantity"
                              aria-label={`Editar quantidade de ${item.cut.name}`}
                              disabled={!!pendingOrder || registeringOrder}
                              onClick={(event) => {
                                openSelection(item.cut, event);
                                setEditingItem(item.original);
                                setQuantity(String(item.quantity));
                                setUnit(item.unit);
                              }}
                            >
                              {item.quantity.toLocaleString("pt-BR")}{" "}
                              {item.unit}
                              <Pencil size={10} />
                            </button>
                            <button
                              aria-label={`Aumentar ${item.cut.name}`}
                              disabled={
                                !!pendingOrder ||
                                registeringOrder ||
                                item.quantity +
                                  (item.unit === "kg" ? 0.25 : 1) >
                                  100
                              }
                              onClick={() => changeQuantity(item.original, 1)}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <span>
                            {money(
                              subtotalCents(item.cut.priceCents, item.quantity),
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
                    <label className="presential">
                      <input
                        type="checkbox"
                        checked={inPerson}
                        disabled={!!pendingOrder || registeringOrder}
                        onChange={(e) => setInPerson(e.target.checked)}
                      />{" "}
                      Quero escolher a peça no balcão
                    </label>
                    <button
                      className="clear-cart"
                      disabled={!!pendingOrder || registeringOrder}
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
                      disabled={
                        registeringOrder ||
                        (!pendingOrder && !businessStatus?.open)
                      }
                    >
                      {registeringOrder ? (
                        "Registrando pedido…"
                      ) : pendingOrder ? (
                        "Tentar confirmar novamente"
                      ) : (
                        <>
                          Enviar pedido ao açougue <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
              <div className="cart-footer">
                <span>
                  <Clock3 size={14} />
                  Seu pedido será preparado após a chamada.
                </span>
              </div>
            </aside>
          </section>
        </div>
        <p
          role="status"
          className={`selection-notice ${notice ? "has-notice" : ""}`}
        >
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
          className="selection-dialog app-modal"
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
            {selected && (
              <div className="selection-photo">
                <CutPhoto cut={selected} />
                <span className="category-label">{selected.category}</span>
              </div>
            )}
            <h2 id="selection-title">{selected?.name}</h2>
            <p className="dialog-description">{selected?.description}</p>
            <p className="dialog-price">
              {selected && money(selected.priceCents)} / {unit}
            </p>
            <div className="quantity-presets" aria-label="Quantidades rápidas">
              {(unit === "kg" ? [0.25, 0.5, 1, 2] : [1, 2, 5]).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    Number(quantity.replace(",", ".")) === value ? "active" : ""
                  }
                  onClick={() => setQuantity(String(value))}
                >
                  {unit === "kg" && value < 1
                    ? `${value * 1000} g`
                    : `${value} ${unit}`}
                </button>
              ))}
            </div>
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
              {editingItem ? <Check size={18} /> : <Plus size={18} />}{" "}
              {editingItem ? "Salvar alteração" : "Adicionar ao pedido"}
              {selectionSubtotal !== null && (
                <span>{money(selectionSubtotal)}</span>
              )}
            </button>
          </form>
        </dialog>
        <p className="image-disclaimer">
          {demo ? "Demonstração com dados fictícios e temporários. " : ""}
          Imagens ilustrativas. Os valores dos cortes por peso são estimados até
          a pesagem no balcão.
        </p>
        {stage === "catalog" && !receipt && (
          <div className="kiosk-cart-bar">
            <span>
              <ShoppingBag size={22} />
              <b>
                {cart.length}{" "}
                {cart.length === 1
                  ? "corte selecionado"
                  : "cortes selecionados"}
              </b>
              <small>Total estimado</small>
              <strong>{money(totalCents)}</strong>
            </span>
            <button
              className="primary"
              onClick={() => setStage("cart")}
              disabled={loading || !!error}
            >
              Ir para o carrinho <ArrowRight size={21} />
            </button>
          </div>
        )}
        {receipt && <OrderSuccess order={receipt} onNewOrder={startNewOrder} />}
      </main>
    </div>
  );
}
