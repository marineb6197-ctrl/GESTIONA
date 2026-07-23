import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, BarChart3, Bell, Bot, Building2, CalendarDays, ChevronDown,
  ClipboardList, CreditCard, FileText, Gauge, LayoutDashboard, LogOut, Menu,
  Package, Plus, Search, Settings, ShoppingCart, Sparkles, Truck, Users, Wallet, X
} from 'lucide-react'
import { alerts, establishments, suppliers } from './data/demo'
import { loadProducts, saveProducts } from './lib/storage'
import { isSupabaseConfigured } from './lib/supabase'
import type { Product } from './types'
import { MetricCard } from './components/MetricCard'
import { Modal } from './components/Modal'

const nav = [
  ['Accueil', LayoutDashboard], ['Produits', Package], ['Stocks', BarChart3], ['Fournisseurs', Truck],
  ['Commandes', ShoppingCart], ['Réceptions', ClipboardList], ['Factures', FileText], ['Recettes', Gauge],
  ['Finance', Wallet], ['Personnel', Users], ['Planning', CalendarDays], ['Paramètres', Settings],
] as const

const moduleCopy: Record<string, { title: string; text: string }> = {
  Commandes: { title: 'Commandes fournisseurs', text: 'Le module est prêt à recevoir les bons de commande, statuts et envois fournisseurs.' },
  Réceptions: { title: 'Réception ORION', text: 'Déposez un bon de livraison ou une facture pour lancer la lecture et le rapprochement.' },
  Factures: { title: 'Factures fournisseurs', text: 'Contrôle commande / livraison / facture, échéances et statuts de paiement.' },
  Recettes: { title: 'Recettes & fiches techniques', text: 'Calculez les coûts matière, rendements et marges par plat.' },
  Finance: { title: 'Pilotage financier', text: 'Suivez achats, ventes, trésorerie et rentabilité par établissement.' },
  Personnel: { title: 'Personnel', text: 'Centralisez contrats, documents, rôles et disponibilités.' },
  Planning: { title: 'Planning', text: 'Organisez les équipes et contrôlez les heures planifiées.' },
  Paramètres: { title: 'Paramètres', text: 'Configurez les établissements, utilisateurs, rôles et intégrations.' },
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [active, setActive] = useState('Accueil')
  const [establishmentId, setEstablishmentId] = useState('all')
  const [products, setProducts] = useState<Product[]>(loadProducts)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [orionOpen, setOrionOpen] = useState(false)
  const [orionQuestion, setOrionQuestion] = useState('')
  const [orionAnswer, setOrionAnswer] = useState('')

  useEffect(() => saveProducts(products), [products])

  const filteredProducts = useMemo(() => products.filter((product) => {
    const establishmentMatches = establishmentId === 'all' || product.establishmentId === establishmentId
    const query = search.trim().toLowerCase()
    return establishmentMatches && (!query || `${product.name} ${product.category} ${product.supplier}`.toLowerCase().includes(query))
  }), [products, establishmentId, search])

  const lowStock = filteredProducts.filter((p) => p.currentStock <= p.minStock)
  const stockValue = filteredProducts.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0)

  function addProduct(form: HTMLFormElement) {
    const data = new FormData(form)
    const product: Product = {
      id: crypto.randomUUID(),
      name: String(data.get('name') || '').trim(),
      category: String(data.get('category') || '').trim(),
      supplier: String(data.get('supplier') || '').trim(),
      unit: String(data.get('unit') || 'unité').trim(),
      purchasePrice: Number(data.get('price') || 0),
      currentStock: Number(data.get('stock') || 0),
      minStock: Number(data.get('minStock') || 0),
      establishmentId: String(data.get('establishmentId') || 'danish'),
    }
    if (!product.name) return
    setProducts((current) => [product, ...current])
    setShowProductModal(false)
  }

  function askOrion() {
    const question = orionQuestion.toLowerCase()
    if (question.includes('commander') || question.includes('stock')) {
      const names = lowStock.map((p) => `${p.name} (${Math.max(0, p.minStock - p.currentStock).toFixed(1)} ${p.unit} minimum à reprendre)`).join(', ')
      setOrionAnswer(names ? `Priorité de commande : ${names}.` : 'Aucun produit n’est actuellement sous son seuil minimum.')
    } else if (question.includes('facture')) {
      setOrionAnswer('Une facture Sligro de 1 842,30 € arrive à échéance demain. Elle doit encore être validée.')
    } else {
      setOrionAnswer(`J’analyse ${filteredProducts.length} produits. ${lowStock.length} article(s) nécessitent une attention et la valeur du stock visible est de ${stockValue.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}.`)
    }
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">G</div><div><strong>GESTIONA</strong><span>Restaurant ERP</span></div></div>
        <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X /></button>
        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setSidebarOpen(false) }}>
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">MB</div><div><strong>Marine</strong><span>Administratrice</span></div>
          <button className="icon-button" onClick={() => setLoggedIn(false)} title="Déconnexion"><LogOut size={17}/></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu/></button>
          <div className="establishment-select"><Building2 size={17}/><select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)}><option value="all">Tous les établissements</option>{establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select><ChevronDown size={14}/></div>
          <div className="top-search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit, fournisseur…" /></div>
          <button className="notification-button"><Bell size={19}/><span>3</span></button>
        </header>

        <div className="content">
          {active === 'Accueil' && <Dashboard products={filteredProducts} lowStock={lowStock} stockValue={stockValue} />}
          {active === 'Produits' && <Products products={filteredProducts} onAdd={() => setShowProductModal(true)} />}
          {active === 'Stocks' && <Stocks products={filteredProducts} />}
          {active === 'Fournisseurs' && <Suppliers />}
          {!['Accueil', 'Produits', 'Stocks', 'Fournisseurs'].includes(active) && <ModulePlaceholder module={active} />}
        </div>
      </main>

      <button className="orion-fab" onClick={() => setOrionOpen(true)}><Sparkles size={20}/><span>ORION</span></button>

      {showProductModal && <Modal title="Nouveau produit" onClose={() => setShowProductModal(false)}>
        <form className="product-form" onSubmit={(e) => { e.preventDefault(); addProduct(e.currentTarget) }}>
          <label>Nom<input name="name" required placeholder="Ex. Saumon fumé" /></label>
          <div className="form-grid"><label>Catégorie<input name="category" required /></label><label>Fournisseur<input name="supplier" required /></label></div>
          <div className="form-grid three"><label>Prix d’achat<input name="price" type="number" step="0.01" min="0" /></label><label>Stock actuel<input name="stock" type="number" step="0.01" min="0" /></label><label>Stock minimum<input name="minStock" type="number" step="0.01" min="0" /></label></div>
          <div className="form-grid"><label>Unité<select name="unit"><option>kg</option><option>litre</option><option>bouteille</option><option>pièce</option><option>carton</option></select></label><label>Établissement<select name="establishmentId">{establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
          <footer><button type="button" className="secondary" onClick={() => setShowProductModal(false)}>Annuler</button><button className="primary">Créer le produit</button></footer>
        </form>
      </Modal>}

      {orionOpen && <Modal title="ORION — Assistant de gestion" onClose={() => setOrionOpen(false)}>
        <div className="orion-panel"><div className="orion-intro"><Bot/><p>Pose une question sur les stocks, commandes ou factures.</p></div><textarea value={orionQuestion} onChange={(e) => setOrionQuestion(e.target.value)} placeholder="Que dois-je commander aujourd’hui ?" />{orionAnswer && <div className="orion-answer">{orionAnswer}</div>}<button className="primary" onClick={askOrion}>Analyser</button></div>
      </Modal>}
    </div>
  )
}

function Login({ onLogin }: { onLogin: () => void }) {
  return <div className="login-screen"><div className="login-card"><div className="brand login-brand"><div className="brand-mark">G</div><div><strong>GESTIONA</strong><span>Restaurant ERP</span></div></div><h1>Bienvenue</h1><p>Connectez-vous à votre espace de gestion.</p><form onSubmit={(e) => { e.preventDefault(); onLogin() }}><label>Adresse e-mail<input type="email" defaultValue="direction@gestiona.be" required /></label><label>Mot de passe<input type="password" defaultValue="gestiona" required /></label><button className="primary full">Se connecter</button></form><small>Mode démonstration — aucune donnée bancaire ou personnelle réelle.</small></div></div>
}

function Dashboard({ products, lowStock, stockValue }: { products: Product[]; lowStock: Product[]; stockValue: number }) {
  return <><div className="page-heading"><div><span className="eyebrow">Cockpit quotidien</span><h1>Bonsoir, Marine</h1><p>Voici les priorités opérationnelles de vos établissements.</p></div><div className={`connection-pill ${isSupabaseConfigured ? 'online' : ''}`}>{isSupabaseConfigured ? 'Supabase connecté' : 'Mode local sécurisé'}</div></div>
  <section className="metrics-grid"><MetricCard label="Chiffre d’affaires" value="8 460 €" detail="+6,4 % vs. mardi dernier" icon={CreditCard}/><MetricCard label="Livraisons attendues" value="3" detail="1 réception à contrôler" icon={Truck}/><MetricCard label="Factures à payer" value="4 920 €" detail="1 échéance demain" icon={FileText}/><MetricCard label="Stock valorisé" value={stockValue.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })} detail={`${lowStock.length} produit(s) critique(s)`} icon={Package}/></section>
  <div className="dashboard-grid"><section className="panel alerts-panel"><header><div><span className="eyebrow">Centre d’actions</span><h2>Priorités ORION</h2></div><button className="text-button">Tout voir</button></header><div className="alert-list">{alerts.map((alert) => <article key={alert.id} className={`alert ${alert.severity}`}><div className="alert-icon"><AlertTriangle size={18}/></div><div><strong>{alert.title}</strong><p>{alert.detail}</p><span>{alert.module}</span></div></article>)}</div></section><section className="panel"><header><div><span className="eyebrow">Stocks</span><h2>Niveaux critiques</h2></div></header><div className="stock-list">{lowStock.slice(0,5).map((p) => <div className="stock-row" key={p.id}><div><strong>{p.name}</strong><span>{p.supplier}</span></div><div className="stock-meter"><i style={{ width: `${Math.min(100, (p.currentStock / Math.max(p.minStock, 1)) * 100)}%` }}/></div><b>{p.currentStock} {p.unit}</b></div>)}{!lowStock.length && <p className="empty">Tous les stocks sont au-dessus de leur seuil.</p>}</div></section></div>
  <section className="panel"><header><div><span className="eyebrow">Activité</span><h2>Vue d’ensemble</h2></div></header><div className="activity-strip"><div><strong>{products.length}</strong><span>Produits suivis</span></div><div><strong>12</strong><span>Commandes ce mois</span></div><div><strong>97,2 %</strong><span>Livraisons conformes</span></div><div><strong>28,4 %</strong><span>Food cost estimé</span></div></div></section></>
}

function Products({ products, onAdd }: { products: Product[]; onAdd: () => void }) {
  return <><div className="page-heading"><div><span className="eyebrow">Référentiel central</span><h1>Produits</h1><p>Une source unique pour les achats, stocks, recettes et ventes.</p></div><button className="primary" onClick={onAdd}><Plus size={17}/>Nouveau produit</button></div><section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Fournisseur</th><th>Prix achat</th><th>Stock</th><th>État</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><span>{p.establishmentId === 'danish' ? 'Danish' : "L'Élysée"}</span></td><td>{p.category}</td><td>{p.supplier}</td><td>{p.purchasePrice.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}/{p.unit}</td><td>{p.currentStock} {p.unit}</td><td><span className={`status ${p.currentStock <= p.minStock ? 'danger' : 'ok'}`}>{p.currentStock <= p.minStock ? 'À commander' : 'Disponible'}</span></td></tr>)}</tbody></table>{!products.length && <p className="empty">Aucun produit ne correspond à la recherche.</p>}</div></section></>
}

function Stocks({ products }: { products: Product[] }) {
  const movements = [
    ['Entrée', 'Beurre doux', '+ 10 kg', 'Réception Sligro'], ['Sortie', 'Saumon fumé Norvège', '- 1,2 kg', 'Production cuisine'], ['Perte', 'Aperol', '- 1 bouteille', 'Casse déclarée'], ['Transfert', 'Crémant', '- 4 bouteilles', "L’Élysée → Danish"],
  ]
  return <><div className="page-heading"><div><span className="eyebrow">Moteur de stock</span><h1>Stocks</h1><p>Suivez entrées, sorties, pertes, transferts et inventaires.</p></div><button className="primary"><Plus size={17}/>Nouveau mouvement</button></div><section className="metrics-grid compact"><MetricCard label="Produits suivis" value={String(products.length)} detail="Dans la sélection active" icon={Package}/><MetricCard label="Sous le minimum" value={String(products.filter((p) => p.currentStock <= p.minStock).length)} detail="Action requise" icon={AlertTriangle}/><MetricCard label="Mouvements aujourd’hui" value="18" detail="Entrées et sorties" icon={BarChart3}/></section><section className="panel"><header><div><span className="eyebrow">Journal</span><h2>Derniers mouvements</h2></div></header><div className="movement-list">{movements.map((m) => <div className="movement-row" key={m.join('')}><span className={`movement-type ${m[0].toLowerCase()}`}>{m[0]}</span><div><strong>{m[1]}</strong><span>{m[3]}</span></div><b>{m[2]}</b><time>Aujourd’hui</time></div>)}</div></section></>
}

function Suppliers() {
  return <><div className="page-heading"><div><span className="eyebrow">Partenaires</span><h1>Fournisseurs</h1><p>Contacts, délais, performances et historique d’achat.</p></div><button className="primary"><Plus size={17}/>Nouveau fournisseur</button></div><div className="supplier-grid">{suppliers.map((s) => <article className="supplier-card" key={s.id}><div className="supplier-logo">{s.name.slice(0,2).toUpperCase()}</div><div><h3>{s.name}</h3><p>{s.email}</p><p>{s.phone}</p></div><div className="supplier-meta"><span>Délai moyen <strong>{s.leadTimeDays} j</strong></span><span>Score <strong>{s.score}/100</strong></span></div></article>)}</div></>
}

function ModulePlaceholder({ module }: { module: string }) {
  const copy = moduleCopy[module] ?? { title: module, text: 'Ce module est intégré à la navigation et prêt pour son prochain sprint métier.' }
  return <div className="module-placeholder"><div className="placeholder-icon"><Sparkles/></div><span className="eyebrow">Module connecté</span><h1>{copy.title}</h1><p>{copy.text}</p><div className="placeholder-roadmap"><div><b>01</b><span>Écran métier</span></div><div><b>02</b><span>Connexion Supabase</span></div><div><b>03</b><span>Automatisations ORION</span></div></div></div>
}
