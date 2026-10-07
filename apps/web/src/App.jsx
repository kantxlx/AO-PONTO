import { useEffect, useState } from 'react';
import { Beef, Search, ArrowUpRight, RefreshCw, ShoppingBag, Drumstick } from 'lucide-react';
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export default function App() {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/cuts', { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Cardápio indisponível'); return response.json(); })
      .then(data => { setCuts(data.cuts); setDemo(data.demo); })
      .catch(err => { if (err.name !== 'AbortError') setError('Não conseguimos carregar o cardápio. Verifique a conexão e tente novamente.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const categories = ['Todos', ...new Set(cuts.map(cut => cut.category))];
  const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibleCuts = cuts.filter(cut => (category === 'Todos' || cut.category === category) && normalized(cut.name).includes(normalized(search)));
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Ao Ponto início"><span className="brand-icon"><Beef size={26}/></span><span>ao<span className="brand-light">ponto</span><small>AÇOUGUE · AUTOATENDIMENTO</small></span></a><span className="header-note"><span className="dot"/> Feito para o seu dia a dia</span></header>
    <main><section className="intro"><div><p className="eyebrow">DO NOSSO BALCÃO PARA SUA MESA</p><h1>Seu próximo prato<br/>começa <em>aqui.</em></h1><p className="subtitle">Escolha seus cortes favoritos.<br/>A gente cuida do resto.</p></div><div className="intro-badge"><Beef size={50} strokeWidth={1.2}/><span>Cortes selecionados.<br/><strong>Sabor de verdade.</strong></span></div></section>
      {demo && <p className="demo-note">Demonstração · produtos e preços fictícios</p>}
      <div className="catalog-layout"><section className="catalog" aria-label="Cardápio"><div className="catalog-tools"><div className="tabs" role="group" aria-label="Categorias">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search"><Search size={18}/><input aria-label="Buscar corte" placeholder="Buscar um corte" value={search} onChange={event => setSearch(event.target.value)}/></label></div>
        <div className="section-heading"><h2>{category === 'Todos' ? 'Conheça nossos cortes' : category}</h2><span>{loading ? 'Carregando…' : `${visibleCuts.length} opções`}</span></div>
        {loading ? <p className="state" role="status">Preparando o cardápio…</p> : error ? <div className="state" role="alert"><p>{error}</p><button className="primary" onClick={() => setRetry(retry + 1)}><RefreshCw size={16}/> Tentar novamente</button></div> : visibleCuts.length === 0 ? <p className="state">Nenhum corte encontrado. Tente outra busca ou categoria.</p> : <div className="grid">{visibleCuts.map(cut => <article className={`cut-card ${!cut.available ? 'unavailable' : ''}`} key={cut.id}><div className={`cut-art ${cut.category === 'Aves' ? 'poultry' : cut.category === 'Suínos' ? 'pork' : ''}`}>{cut.category === 'Aves' ? <Drumstick size={78} strokeWidth={1}/> : <Beef size={88} strokeWidth={1}/>}<span className="category-label">{cut.category}</span>{!cut.available && <span className="sold-out">Indisponível</span>}</div><div className="cut-info"><h3>{cut.name}</h3><p>{cut.description}</p><div className="cut-bottom"><span className="price">{money(cut.priceCents)}<small>/{cut.units[0]}</small></span><button className="select-cut" disabled aria-label={`Seleção de ${cut.name} em breve`}><ArrowUpRight size={20}/></button></div></div></article>)}</div>}
      </section><aside className="cart"><div className="cart-heading"><h2>Sua seleção</h2><ShoppingBag size={21}/></div><div className="empty-cart"><span><ShoppingBag size={36} strokeWidth={1.2}/></span><h3>O que vai ser hoje?</h3><p>Em breve você poderá adicionar<br/>seus cortes por aqui.</p></div><div className="cart-footer"><span>Escolha com calma. Prepare com carinho.</span></div></aside></div>
    </main><footer><span>ao ponto <span className="footer-dot">·</span> Cada corte, uma boa escolha.</span><span>Autoatendimento</span></footer>
  </div>;
}
