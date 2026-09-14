"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

type Item = { description: string; quantity: number; price: number };
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const defaultServiceDescription = "Nos es grato dirigirnos a ustedes, para saludarlos cordialmente y hacerle llegar nuestra propuesta económica por la realización de los siguientes trabajos:";
const knownClients = ["Grupo Santa Elena", "Redondos", "San Fernando"];
const knownLocations: Record<string, string[]> = {
  "Grupo Santa Elena": ["Planta Hilasaca · Ica"],
  Redondos: ["Planta Toshi 5 · Huaura", "Planta 256 · Huaura"],
  "San Fernando": ["Plantel 261 · Chincha", "Plantel 127 · Chincha"],
};
const PeruMap = dynamic(() => import("@/components/peru-map"), { ssr: false, loading: () => <div className="map-loading">Cargando mapa de Perú…</div> });
const quotations: Array<[string, string, string, string, number]> = [
  ["COT-2026-0012", "Grupo Santa Elena", "Hilasaca · Ica", "Enviada", 14915.2],
  ["COT-2026-0011", "Redondos", "Planta Toshi 5 · Huaura", "Aprobada", 8740],
  ["COT-2026-0010", "San Fernando", "Plantel 261 · Chincha", "Borrador", 4250],
  ["COT-2026-0009", "Redondos", "Planta 256 · Huaura", "Aprobada", 11230],
] ;
const allQuotations: Array<[string, string, string, string, number]> = [
  ...quotations,
  ["COT-2026-0008", "Edificio Vandergerh", "Lima", "Enviada", 6320],
];

export default function Home() {
  const [section, setSection] = useState<"dashboard" | "list" | "new">("dashboard");
  const [team, setTeam] = useState("Operaciones Norte");
  const [serviceDescription, setServiceDescription] = useState(defaultServiceDescription);
  const [items, setItems] = useState<Item[]>([
    { description: "Movilización de personal y equipos", quantity: 2, price: 450 },
    { description: "Servicio de mantenimiento especializado", quantity: 1, price: 2850 },
  ]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.price, 0), [items]);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const updateItem = (index: number, key: keyof Item, value: string) => setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: key === "description" ? value : Number(value.replace(",", ".")) || 0 } : item));

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">C</span><span>Cotiza<span>Pro</span></span></div>
      <p className="workspace-label">ESPACIO DE TRABAJO</p>
      <select className="team-switcher" value={team} onChange={(event) => setTeam(event.target.value)} aria-label="Equipo activo"><option>Operaciones Norte</option><option>Proyectos Especiales</option></select>
      <nav>
        <button className={section === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setSection("dashboard")}>▦ <span>Panel general</span></button>
        <button className={section === "list" || section === "new" ? "nav-item active" : "nav-item"} onClick={() => setSection("list")}>▣ <span>Cotizaciones</span></button>
        <button className="nav-item muted">♙ <span>Clientes</span></button><button className="nav-item muted">♚ <span>Mi equipo</span></button><button className="nav-item muted">⌖ <span>Ubicaciones</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="avatar">GM</div><div><strong>Gustavo M.</strong><small>Administrador</small></div><span>⌄</span></div>
    </aside>
    <section className="content">
      <header><div className="crumb">{section === "dashboard" ? "Resumen del negocio" : "Cotizaciones / Nueva cotización"}</div><button className="help">?</button></header>
      {section === "dashboard" ? <Dashboard team={team} onNew={() => setSection("new")} onAll={() => setSection("list")} /> : section === "list" ? <QuotationList onNew={() => setSection("new")} /> : <QuotationForm items={items} subtotal={subtotal} igv={igv} total={total} serviceDescription={serviceDescription} setServiceDescription={setServiceDescription} updateItem={updateItem} addItem={() => setItems([...items, { description: "", quantity: 1, price: 0 }])} removeItem={(i) => setItems(items.filter((_, index) => index !== i))} />}
    </section>
  </main>;
}

function Dashboard({ onNew, onAll, team }: { onNew: () => void; onAll: () => void; team: string }) { return <>
  <div className="page-heading"><div><p className="eyebrow">{team.toUpperCase()} · SEPTIEMBRE 2026</p><h1>Buenos días, Gustavo</h1><p className="subtle">Aquí tienes el resumen de las cotizaciones de tu equipo.</p></div><button className="primary" onClick={onNew}>＋ Nueva cotización</button></div>
  <div className="metrics"><Metric label="Total cotizado" value="S/ 39,135.20" trend="↑ 12.5%" /><Metric label="Cotizaciones enviadas" value="8" trend="↑ 3 este mes" /><Metric label="Tasa de aprobación" value="72%" trend="↑ 8% vs. agosto" /><Metric label="Pendientes de revisión" value="3" trend="Requieren atención" warn /></div>
  <div className="dashboard-grid">
    <section className="card chart-card"><div className="card-title"><div><h2>Actividad de cotizaciones</h2><p>Montos enviados durante las últimas semanas</p></div><button className="select">Últimas 8 semanas⌄</button></div><div className="chart"><div className="y-axis"><span>15k</span><span>10k</span><span>5k</span><span>0</span></div><svg viewBox="0 0 640 230" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#2b7a66" stopOpacity=".22"/><stop offset="1" stopColor="#2b7a66" stopOpacity="0"/></linearGradient></defs><path d="M0,176 C45,164 70,172 104,144 S159,113 198,135 S250,169 285,130 S342,88 385,111 S448,163 487,100 S558,50 640,72 L640,230 L0,230Z" fill="url(#fill)"/><path d="M0,176 C45,164 70,172 104,144 S159,113 198,135 S250,169 285,130 S342,88 385,111 S448,163 487,100 S558,50 640,72" fill="none" stroke="#2b7a66" strokeWidth="3"/></svg><div className="x-axis"><span>21 jul</span><span>4 ago</span><span>18 ago</span><span>1 sep</span><span>8 sep</span></div></div></section>
    <section className="card status-card"><div className="card-title"><div><h2>Estado de cotizaciones</h2><p>Distribución del mes actual</p></div></div><div className="donut"><div><strong>12</strong><span>total</span></div></div><div className="legend"><p><i className="green"/>Aprobadas <b>6</b></p><p><i className="blue"/>Enviadas <b>3</b></p><p><i className="orange"/>Borradores <b>2</b></p><p><i className="gray"/>Rechazadas <b>1</b></p></div></section>
  </div>
  <section className="card map-card"><div className="card-title"><div><h2>Ubicaciones de cotizaciones</h2><p>Puntos registrados en Perú</p></div><span className="map-legend">● Con coordenadas &nbsp; ○ Referencia aproximada</span></div><PeruMap/></section>
  <section className="card table-card"><div className="card-title"><div><h2>Cotizaciones recientes</h2><p>Últimos movimientos registrados</p></div><button className="link-button" onClick={onAll}>Ver todas →</button></div><div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>CLIENTE</th><th>UBICACIÓN</th><th>ESTADO</th><th className="right">TOTAL</th><th/></tr></thead><tbody>{quotations.map(([code, client, location, status, amount]) => <tr key={code}><td><strong>{code}</strong><small>12 sep. 2026</small></td><td>{client}</td><td className="location">⌖ {location}</td><td><span className={`status ${status.toLowerCase()}`}>{status}</span></td><td className="right amount">{money.format(amount)}</td><td className="dots">•••</td></tr>)}</tbody></table></div></section>
</>; }
function Metric({ label, value, trend, warn }: { label: string; value: string; trend: string; warn?: boolean }) { return <section className="metric"><p>{label}</p><h2>{value}</h2><small className={warn ? "warning" : "positive"}>{trend}</small></section>; }

function QuotationList({ onNew }: { onNew: () => void }) { return <><div className="page-heading"><div><p className="eyebrow">OPERACIONES NORTE</p><h1>Todas las cotizaciones</h1><p className="subtle">Consulta el historial completo del equipo.</p></div><button className="primary" onClick={onNew}>＋ Nueva cotización</button></div><section className="card quotation-list"><div className="list-filters"><input placeholder="Buscar por código, cliente o ubicación"/><select defaultValue=""><option value="">Todos los estados</option><option>Aprobada</option><option>Enviada</option><option>Borrador</option></select><button className="secondary">Exportar Excel</button></div><div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>FECHA</th><th>CLIENTE</th><th>UBICACIÓN</th><th>ESTADO</th><th className="right">TOTAL</th></tr></thead><tbody>{allQuotations.map(([code, client, location, status, amount]) => <tr key={code}><td><strong>{code}</strong></td><td>10 sep. 2026</td><td>{client}</td><td className="location">⌖ {location}</td><td><span className={`status ${status.toLowerCase()}`}>{status}</span></td><td className="right amount">{money.format(amount)}</td></tr>)}</tbody></table></div></section></>; }

function ClientLocationFields() {
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const isNewClient = Boolean(client.trim()) && !knownClients.some((item) => item.toLowerCase() === client.trim().toLowerCase());
  const locations = knownLocations[client] ?? [];
  const isNewLocation = Boolean(location.trim()) && !locations.some((item) => item.toLowerCase() === location.trim().toLowerCase());
  return <>
    <label>Cliente<input list="clients" value={client} onChange={(event) => { setClient(event.target.value); setLocation(""); }} placeholder="Escribe o selecciona un cliente"/><datalist id="clients">{knownClients.map((item) => <option value={item} key={item}/>)}</datalist><small className="field-help">Escribe para buscar. Si no existe, se registrará como cliente nuevo.</small></label>
    <label>Ubicación<input list="locations" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={client ? "Escribe o selecciona una ubicación" : "Primero indica un cliente"} disabled={!client}/><datalist id="locations">{locations.map((item) => <option value={item} key={item}/>)}</datalist><small className="field-help">Se mostrarán sedes del cliente; también puedes agregar una nueva.</small></label>
    <label>Coordenadas <input value={coordinates} onChange={(event) => setCoordinates(event.target.value)} placeholder="Ej. -11.94824; -76.70684"/><small className="field-help">Opcional. Separar latitud y longitud con punto y coma o coma.</small></label>
    <label>Referencia aproximada <input placeholder="Ej. Juan Blas 6, Pamplona Alta" disabled={Boolean(coordinates.trim())}/><small className="field-help">Usa esta referencia si no dispones de coordenadas.</small></label>
    {isNewClient && <div className="new-record full"><strong>Nuevo cliente</strong><div><label>RUC <input placeholder="Opcional"/></label><label>Contacto <input placeholder="Nombre de contacto"/></label><label>Teléfono <input placeholder="Opcional"/></label></div></div>}
    {isNewLocation && <div className="new-record full"><strong>Nueva ubicación para {client}</strong><div><label>Dirección <input placeholder="Dirección o referencia"/></label><label>Distrito <input placeholder="Distrito"/></label><label>Provincia <input placeholder="Provincia"/></label></div></div>}
  </>;
}

function PreviewModal({ description, items, subtotal, igv, total, onClose }: { description: string; items: Item[]; subtotal: number; igv: number; total: number; onClose: () => void }) {
  return <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de cotización"><section className="preview-sheet"><div className="preview-header"><div><p className="eyebrow">COTIZACIÓN · COT-2026-0013</p><h2>Vista previa</h2></div><button className="close-preview" onClick={onClose} aria-label="Cerrar vista previa">×</button></div><p className="preview-intro">{description}</p><table className="preview-table"><thead><tr><th>DESCRIPCIÓN</th><th>CANT.</th><th className="right">PARCIAL</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description || "Partida sin descripción"}</td><td>{item.quantity}</td><td className="right">{money.format(item.quantity * item.price)}</td></tr>)}</tbody></table><div className="preview-totals"><p><span>Subtotal</span><b>{money.format(subtotal)}</b></p><p><span>IGV (18%)</span><b>{money.format(igv)}</b></p><p className="preview-total"><span>Total</span><b>{money.format(total)}</b></p></div><div className="preview-actions"><button className="secondary" onClick={onClose}>Volver a editar</button><button className="primary">Descargar PDF</button></div></section></div>;
}

function QuotationForm({ items, subtotal, igv, total, serviceDescription, setServiceDescription, updateItem, addItem, removeItem }: { items: Item[]; subtotal: number; igv: number; total: number; serviceDescription: string; setServiceDescription: (value: string) => void; updateItem: (i: number, k: keyof Item, v: string) => void; addItem: () => void; removeItem: (i: number) => void }) { const [showPreview, setShowPreview] = useState(false); return <>
  <div className="page-heading"><div><p className="eyebrow">BORRADOR · COT-2026-0013</p><h1>Nueva cotización</h1><p className="subtle">Completa la información para generar una propuesta clara y trazable.</p></div><div className="actions"><button className="secondary">Guardar borrador</button><button className="primary" onClick={() => setShowPreview(true)}>Vista previa PDF</button></div></div>
  <div className="form-layout"><div className="form-stack"><section className="card form-card"><h2>Datos de la cotización</h2><div className="form-grid"><ClientLocationFields/><label>Fecha<input type="date" defaultValue="2026-09-13" /></label><label className="full">Tipo de servicio<input placeholder="Ej. Mantenimiento preventivo" /></label><label className="full">Descripción del servicio<textarea value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} onBlur={(event) => { if (!event.target.value.trim()) setServiceDescription(defaultServiceDescription); }} rows={4}/><small className="field-help">Texto predeterminado editable. Si queda vacío, se restaurará al guardar.</small></label></div></section>
    <section className="card form-card"><div className="card-title"><div><h2>Partidas económicas</h2><p>Los montos se calculan automáticamente.</p></div><button className="secondary small" onClick={addItem}>＋ Agregar partida</button></div><div className="items-head"><span>DESCRIPCIÓN</span><span>CANT.</span><span>P. UNITARIO</span><span>PARCIAL</span><span/></div>{items.map((item, i) => <div className="item-row" key={i}><input aria-label="Descripción" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Descripción de partida"/><input aria-label="Cantidad" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)}/><input aria-label="Precio unitario" type="text" inputMode="decimal" value={item.price || ""} onChange={(e) => updateItem(i, "price", e.target.value)} onBlur={(e) => updateItem(i, "price", e.target.value)} placeholder="0.00"/><strong>{money.format(item.quantity * item.price)}</strong><button className="remove" aria-label="Eliminar partida" onClick={() => removeItem(i)}>×</button></div>)}</section></div>
    <aside className="card totals"><p>RESUMEN ECONÓMICO</p><div><span>Subtotal</span><b>{money.format(subtotal)}</b></div><div><span>IGV (18%)</span><b>{money.format(igv)}</b></div><hr/><div className="total"><span>Total</span><b>{money.format(total)}</b></div><button className="primary full-button">Guardar cotización</button><small>Al guardar se creará la versión inicial.</small></aside></div>
  {showPreview && <PreviewModal description={serviceDescription} items={items} subtotal={subtotal} igv={igv} total={total} onClose={() => setShowPreview(false)}/>} 
</>; }
