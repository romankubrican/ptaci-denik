import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ═══════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════ */

const CATEGORIES = {
  pevci:    { name: "Pěvci",       icon: "🐦", color: "#5A8F3D" },
  dravci:   { name: "Dravci",      icon: "🦅", color: "#A0522D" },
  vodni:    { name: "Vodní ptáci", icon: "🦆", color: "#2878A6" },
  splhavci: { name: "Šplhavci",    icon: "🪶", color: "#B8860B" },
  ostatni:  { name: "Ostatní",     icon: "🕊️", color: "#6B5B73" },
};

const BIRDS_BUILTIN = [
  ["Bělořit šedý","pevci"],["Berneška velká","vodni"],["Brhlík lesní","pevci"],
  ["Budníček menší/velký","pevci"],["Budníček lesní","pevci"],["Čáp bílý","ostatni"],
  ["Červenka obecná","pevci"],["Čírka obecná","vodni"],["Čížek obecný","pevci"],
  ["Datel černý","splhavci"],["Datlík tříprstý","splhavci"],["Dlask tlustozobý","pevci"],
  ["Drozd zpěvný","pevci"],["Drozd kvíčala","pevci"],["Drozd brávník","pevci"],
  ["Dudek chocholatý","ostatni"],["Havran polní","ostatni"],["Holub hřivnáč","ostatni"],
  ["Hrdlička zahradní","ostatni"],["Husa divoká","vodni"],["Husice nilská","vodni"],
  ["Hvízdák eurasijský","vodni"],["Hýl obecný","pevci"],["Jeřáb popelavý","vodni"],
  ["Jiřička obecná","ostatni"],["Kachna divoká","vodni"],["Káně lesní","dravci"],
  ["Kavka obecná","ostatni"],["Konipas bílý","pevci"],["Konipas horský","pevci"],
  ["Konopka obecná","pevci"],["Kormorán velký","vodni"],["Koroptev polní","ostatni"],
  ["Kos černý","pevci"],["Kos horský","pevci"],["Krahujec obecný","dravci"],
  ["Krkavec velký","ostatni"],["Králíček ohnivý","pevci"],["Králíček obecný","pevci"],
  ["Křivka obecná","pevci"],["Kukačka obecná","ostatni"],["Ledňáček říční","vodni"],
  ["Lejsek bělokrký","pevci"],["Lejsek šedý","pevci"],["Linduška horská","pevci"],
  ["Lžičák pestrý","vodni"],["Mlynařík dlouhoocasý","pevci"],["Morčák velký","vodni"],
  ["Orel mořský","dravci"],["Ořešník kropenatý","ostatni"],["Pěnice černohlavá","pevci"],
  ["Pěnice hnědokřídlá","pevci"],["Pěnice pokrovní","pevci"],["Pěnkava obecná","pevci"],
  ["Pěnkava jikavec","pevci"],["Pěvuška modrá","pevci"],["Písík obecný","vodni"],
  ["Polák chocholačka","vodni"],["Polák velký","vodni"],["Poštolka obecná","dravci"],
  ["Potápka černokrká","vodni"],["Potápka roháč","vodni"],["Rákosník velký","pevci"],
  ["Rákosník zpěvný","pevci"],["Rehek domácí","pevci"],["Rehek zahradní","pevci"],
  ["Sedmihlásek hájní","pevci"],["Skorec vodní","pevci"],["Skřivan polní","pevci"],
  ["Slavík obecný","pevci"],["Slípka zelenonohá","vodni"],["Stehlík obecný","pevci"],
  ["Sojka obecná","ostatni"],["Straka obecná","ostatni"],["Strakapoud velký","splhavci"],
  ["Strakapoud prostřední","splhavci"],["Střízlík obecný","pevci"],["Strnad obecný","pevci"],
  ["Sýkora koňadra","pevci"],["Sýkora modřinka","pevci"],["Sýkora uhelníček","pevci"],
  ["Sýkora parukářka","pevci"],["Šoupálek krátkoprstý","pevci"],["Špaček obecný","pevci"],
  ["Ťuhýk obecný","pevci"],["Vlaštovka obecná","ostatni"],["Vlha pestrá","ostatni"],
  ["Volavka popelavá","vodni"],["Volavka bílá","vodni"],["Vrabec domácí","pevci"],
  ["Vrabec polní","pevci"],["Vrána šedá","ostatni"],["Zvonek zelený","pevci"],
  ["Zvonohlík zahradní","pevci"],["Žluna zelená","splhavci"],["Žluva hájní","pevci"],
].map(([name, cat], i) => ({ id: i + 1, name, category: cat, custom: false }));

/* ═══════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════ */

const T = {
  bg: "#F5F1E8", card: "#FFFEF9", dark: "#1A3318", darkMid: "#2A4F1E",
  green: "#3D7A34", greenSoft: "#E5EDDF", greenText: "#2D5F26",
  amber: "#C07A20", amberSoft: "#FBF0DC",
  brown: "#3B2A1A", brownMid: "#7A6B55",
  text: "#2B2317", textMuted: "#8A7E6E",
  border: "#DDD7CA", white: "#FFFFFF",
  accent: "#C94D38", cream: "#FAF6EC",
};
const ff = `'Playfair Display','Georgia',serif`;
const fs = `'Source Sans 3','Segoe UI',sans-serif`;

/* ═══════════════════════════════════════════════
   STORAGE (localStorage)
   ═══════════════════════════════════════════════ */

const STORE = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.error(e); }
  },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"}) : "";
const monthName = m => ["Led","Úno","Bře","Dub","Kvě","Čvn","Čvc","Srp","Zář","Říj","Lis","Pro"][m];

/* ═══════════════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{min-height:100vh}
body{background:${T.bg};font-family:${fs}}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
input,select,textarea{
  font-family:${fs};font-size:14px;border:1.5px solid ${T.border};border-radius:10px;
  padding:10px 14px;background:${T.white};color:${T.text};outline:none;width:100%;
  transition:border .2s,box-shadow .2s;
}
input:focus,select:focus,textarea:focus{border-color:${T.green};box-shadow:0 0 0 3px ${T.greenSoft}}
textarea{resize:vertical;min-height:56px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp .4s ease-out both}
.leaflet-container{border-radius:14px !important}
`;

/* ═══════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════ */

function Btn({ children, onClick, primary, small, disabled, style: sx }) {
  const base = {
    fontFamily: fs, fontWeight: 600, borderRadius: 10, border: "none",
    cursor: disabled?"not-allowed":"pointer", transition: "all .2s",
    opacity: disabled ? .45 : 1, display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: small ? 13 : 14, padding: small ? "7px 14px" : "11px 22px",
  };
  const v = primary
    ? { background: T.green, color: T.white, boxShadow: "0 2px 10px rgba(61,122,52,.3)" }
    : { background: T.white, color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...v, ...sx }}>{children}</button>;
}

function Search({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,opacity:.35 }}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ paddingLeft: 40, borderRadius: 12, height: 44 }} />
    </div>
  );
}

function CatPills({ selected, onChange, counts }) {
  const pill = (key, label, color, active) => (
    <button key={key} onClick={()=>onChange(key===selected?null:key)} style={{
      fontFamily:fs, fontSize:12, fontWeight:600, padding:"6px 13px", borderRadius:20,
      border:`1.5px solid ${active?color:T.border}`, cursor:"pointer",
      background:active?color+"18":T.white, color:active?color:T.textMuted,
      transition:"all .2s", whiteSpace:"nowrap",
    }}>{label}</button>
  );
  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
      {pill(null, `Vše (${counts.all||0})`, T.green, !selected)}
      {Object.entries(CATEGORIES).map(([k,c])=>pill(k,`${c.icon} ${c.name} (${counts[k]||0})`,c.color,selected===k))}
    </div>
  );
}

function Stat({ icon, value, sub, color }) {
  return (
    <div style={{ background:T.card,borderRadius:14,padding:"18px 16px",border:`1.5px solid ${T.border}`,flex:"1 1 140px",minWidth:130 }}>
      <div style={{ fontSize:26,marginBottom:4 }}>{icon}</div>
      <div style={{ fontFamily:ff,fontSize:30,fontWeight:700,color:color||T.text }}>{value}</div>
      <div style={{ fontFamily:fs,fontSize:12,color:T.textMuted,marginTop:1 }}>{sub}</div>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ fontFamily:fs,fontSize:13,fontWeight:600,color:T.brownMid,marginBottom:3,display:"block" }}>{children}</label>;
}

/* ═══════════════════════════════════════════════
   LEAFLET MAP
   ═══════════════════════════════════════════════ */

function SightingsMap({ sightings }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const withCoords = useMemo(() => sightings.filter(s => s.lat && s.lng), [sightings]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    const map = L.map(mapRef.current, { scrollWheelZoom: true }).setView([49.75, 15.5], 7);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    withCoords.forEach(s => {
      const cat = CATEGORIES[s.birdCategory];
      const icon = L.divIcon({
        html: `<div style="font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));line-height:1">${cat?.icon||"🐦"}</div>`,
        className: "", iconSize: [30, 30], iconAnchor: [15, 15],
      });
      L.marker([s.lat, s.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;min-width:150px">
          <strong style="font-size:14px">${s.birdName}</strong><br/>
          <span style="font-size:12px;color:#666">📅 ${fmtDate(s.date)}</span><br/>
          ${s.location?`<span style="font-size:12px;color:#666">📍 ${s.location}</span><br/>`:""}
          ${s.observer?`<span style="font-size:12px;color:#666">👤 ${s.observer}</span>`:""}</div>`);
    });

    if (withCoords.length > 0) {
      map.fitBounds(L.latLngBounds(withCoords.map(s => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 13 });
    }

    setTimeout(() => map.invalidateSize(), 200);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [withCoords]);

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text,marginBottom:4 }}>Mapa pozorování</h2>
      <p style={{ fontFamily:fs,fontSize:14,color:T.textMuted,marginBottom:16 }}>
        {withCoords.length} pozorování se souřadnicemi z celkem {sightings.length}
      </p>
      {withCoords.length === 0 ? (
        <div style={{ background:T.card,borderRadius:16,padding:48,textAlign:"center",border:`1.5px solid ${T.border}` }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🗺️</div>
          <p style={{ fontFamily:fs,color:T.textMuted,lineHeight:1.6 }}>
            Zatím žádná pozorování s GPS souřadnicemi.<br/>
            Při přidávání záznamu klikněte na <strong>📍 Moje poloha</strong>.
          </p>
        </div>
      ) : (
        <div ref={mapRef} style={{
          height: 500, borderRadius: 16, border: `1.5px solid ${T.border}`,
          overflow: "hidden", background: T.card,
        }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAP PICKER (for selecting location on map)
   ═══════════════════════════════════════════════ */

function MapPicker({ lat, lng, onSelect, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const initLat = lat || 49.75;
    const initLng = lng || 15.5;
    const initZoom = lat ? 14 : 7;

    const map = L.map(mapRef.current).setView([initLat, initLng], initZoom);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    map.on("click", (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([newLat, newLng]).addTo(map);
      onSelect(newLat.toFixed(6), newLng.toFixed(6));
    });

    setTimeout(() => map.invalidateSize(), 200);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:100,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={onClose}>
      <div className="fade-up" onClick={e=>e.stopPropagation()} style={{
        background:T.card,borderRadius:20,padding:20,maxWidth:640,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <h3 style={{ fontFamily:ff,fontSize:20,fontWeight:700,color:T.text }}>📍 Vyberte místo na mapě</h3>
          <Btn small onClick={onClose}>✕ Zavřít</Btn>
        </div>
        <div ref={mapRef} style={{ height: 400, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}` }} />
        <p style={{ fontFamily:fs,fontSize:12,color:T.textMuted,marginTop:8,textAlign:"center" }}>
          Klikněte na mapu pro umístění špendlíku
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AI ATLAS (calls /api/atlas serverless fn)
   ═══════════════════════════════════════════════ */

function BirdInfoPanel({ birdName }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cache = useRef({});

  const fetchInfo = async () => {
    if (cache.current[birdName]) { setInfo(cache.current[birdName]); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdName }),
      });
      if (!res.ok) throw new Error("API error");
      const parsed = await res.json();
      cache.current[birdName] = parsed;
      setInfo(parsed);
    } catch (e) {
      setError("Nepodařilo se načíst informace z atlasu. Ujistěte se, že je ANTHROPIC_API_KEY nastaven v nastavení Vercel.");
    }
    setLoading(false);
  };

  useEffect(() => { setInfo(null); setError(null); }, [birdName]);

  if (info) {
    const fields = [
      ["📏 Velikost", info.size], ["🌿 Prostředí", info.habitat],
      ["🎨 Vzhled", info.description], ["🦜 Chování", info.behavior],
      ["🎵 Hlas", info.song], ["💡 Zajímavost", info.interesting],
    ];
    return (
      <div className="fade-up" style={{
        background: `linear-gradient(135deg,${T.greenSoft},${T.amberSoft})`,
        borderRadius: 14, padding: 20, marginTop: 16, border: `1px solid ${T.border}`,
      }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:6 }}>
          <h4 style={{ fontFamily:ff,fontSize:18,fontWeight:600,color:T.text }}>📚 Atlas</h4>
          <span style={{ fontFamily:fs,fontSize:13,fontStyle:"italic",color:T.brownMid }}>{info.latin}</span>
        </div>
        {fields.map(([label, val]) => val && (
          <div key={label} style={{ marginBottom: 8 }}>
            <span style={{ fontFamily:fs,fontSize:12,fontWeight:700,color:T.greenText }}>{label}</span>
            <p style={{ fontFamily:fs,fontSize:14,color:T.text,lineHeight:1.45,margin:"2px 0 0" }}>{val}</p>
          </div>
        ))}
        <div style={{ fontFamily:fs,fontSize:11,color:T.textMuted,marginTop:10,fontStyle:"italic" }}>
          ℹ️ Generováno AI atlasem — doporučujeme ověřit v odborné literatuře
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {loading ? (
        <div style={{ textAlign:"center",padding:20,fontFamily:fs,color:T.textMuted }}>
          <span style={{ display:"inline-block",animation:"spin 1s linear infinite",fontSize:20 }}>🔄</span>
          <div style={{ marginTop:6 }}>Načítám informace z atlasu…</div>
        </div>
      ) : error ? (
        <div style={{ fontFamily:fs,fontSize:13,color:T.accent,padding:12 }}>{error}</div>
      ) : (
        <Btn small onClick={fetchInfo}>📚 Zobrazit info z AI atlasu</Btn>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ADD BIRD MODAL
   ═══════════════════════════════════════════════ */

function AddBirdModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pevci");

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:100,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20,
    }} onClick={onClose}>
      <div className="fade-up" onClick={e=>e.stopPropagation()} style={{
        background:T.card,borderRadius:20,padding:28,maxWidth:420,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",
      }}>
        <h3 style={{ fontFamily:ff,fontSize:22,fontWeight:700,color:T.text,marginBottom:18 }}>Přidat nový druh</h3>
        <div style={{ marginBottom:14 }}>
          <Label>Název druhu *</Label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Např. Orel skalní" autoFocus />
        </div>
        <div style={{ marginBottom:20 }}>
          <Label>Kategorie</Label>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            {Object.entries(CATEGORIES).map(([k,c])=><option key={k} value={k}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <Btn primary onClick={()=>{if(name.trim()){onAdd({id:uid(),name:name.trim(),category,custom:true});onClose()}}}
            disabled={!name.trim()} style={{ flex:1 }}>✓ Přidat druh</Btn>
          <Btn onClick={onClose}>Zrušit</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: ATLAS
   ═══════════════════════════════════════════════ */

function AtlasPage({ birds, sightings, onAddSighting, onAddBird }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showAddBird, setShowAddBird] = useState(false);
  const [showOnlySeen, setShowOnlySeen] = useState(false);

  const sightingMap = useMemo(() => {
    const m = {};
    sightings.forEach(s => { m[s.birdId] = (m[s.birdId]||0)+1; });
    return m;
  }, [sightings]);

  const counts = useMemo(() => {
    const c = { all: birds.length };
    birds.forEach(b => { c[b.category] = (c[b.category]||0)+1; });
    return c;
  }, [birds]);

  const filtered = useMemo(() => {
    return birds.filter(b => {
      if (catFilter && b.category !== catFilter) return false;
      if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (showOnlySeen && !sightingMap[b.id]) return false;
      return true;
    });
  }, [birds, search, catFilter, showOnlySeen, sightingMap]);

  const birdSightings = useMemo(() => {
    if (!selected) return [];
    return sightings.filter(s => s.birdId === selected.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  }, [selected, sightings]);

  if (selected) {
    const cat = CATEGORIES[selected.category];
    return (
      <div className="fade-up">
        <button onClick={()=>setSelected(null)} style={{
          fontFamily:fs,fontSize:14,color:T.green,background:"none",border:"none",
          cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:6,
        }}>← Zpět na atlas</button>
        <div style={{
          background:`linear-gradient(135deg,${cat.color}12,${cat.color}06)`,
          borderRadius:20,padding:"30px 26px",border:`1.5px solid ${cat.color}30`,marginBottom:8,
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:48 }}>{cat.icon}</span>
            {selected.custom && <span style={{
              fontFamily:fs,fontSize:10,fontWeight:700,color:T.amber,background:T.amberSoft,
              padding:"2px 8px",borderRadius:8,
            }}>VLASTNÍ DRUH</span>}
          </div>
          <h2 style={{ fontFamily:ff,fontSize:30,fontWeight:700,color:T.text,marginBottom:6 }}>{selected.name}</h2>
          <span style={{
            fontFamily:fs,fontSize:12,color:cat.color,fontWeight:600,
            background:cat.color+"18",padding:"4px 12px",borderRadius:12,
          }}>{cat.name}</span>
          <div style={{ marginTop:16,display:"flex",gap:24,flexWrap:"wrap" }}>
            <div>
              <div style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text }}>{sightingMap[selected.id]||0}</div>
              <div style={{ fontFamily:fs,fontSize:13,color:T.textMuted }}>pozorování</div>
            </div>
            {birdSightings.length>0 && <div>
              <div style={{ fontFamily:ff,fontSize:18,fontWeight:700,color:T.text }}>{fmtDate(birdSightings[0].date)}</div>
              <div style={{ fontFamily:fs,fontSize:13,color:T.textMuted }}>poslední</div>
            </div>}
          </div>
          <div style={{ marginTop:16 }}>
            <Btn primary onClick={()=>onAddSighting(selected)}>+ Zaznamenat pozorování</Btn>
          </div>
        </div>

        <BirdInfoPanel birdName={selected.name} />

        {birdSightings.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontFamily:ff,fontSize:20,fontWeight:600,color:T.text,marginBottom:12 }}>Historie pozorování</h3>
            {birdSightings.map(s => (
              <div key={s.id} style={{
                background:T.card,borderRadius:12,padding:"14px 18px",border:`1px solid ${T.border}`,marginBottom:8,
              }}>
                <div style={{ fontFamily:fs,fontWeight:600,fontSize:14,color:T.text }}>📍 {s.location||"Neznámé místo"}</div>
                <div style={{ fontFamily:fs,fontSize:13,color:T.textMuted,marginTop:2 }}>
                  {fmtDate(s.date)} {s.observer?`· 👤 ${s.observer}`:""}
                  {s.lat?` · 🌐 ${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}`:""}
                </div>
                {s.notes && <div style={{ fontFamily:fs,fontSize:13,color:T.brownMid,marginTop:6,fontStyle:"italic" }}>„{s.notes}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text,marginBottom:2 }}>Atlas ptáků</h2>
          <p style={{ fontFamily:fs,fontSize:14,color:T.textMuted }}>
            {birds.length} druhů · {Object.keys(sightingMap).length} spatřeno ({birds.length>0?Math.round(Object.keys(sightingMap).length/birds.length*100):0} %)
          </p>
        </div>
        <Btn small onClick={()=>setShowAddBird(true)}>+ Nový druh</Btn>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:18 }}>
        <Search value={search} onChange={setSearch} placeholder="Hledat ptáka…" />
        <CatPills selected={catFilter} onChange={setCatFilter} counts={counts} />
        <label style={{ fontFamily:fs,fontSize:13,color:T.textMuted,display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none" }}>
          <input type="checkbox" checked={showOnlySeen} onChange={e=>setShowOnlySeen(e.target.checked)}
            style={{ width:"auto",accentColor:T.green }} /> Zobrazit jen spatřené druhy
        </label>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:10 }}>
        {filtered.map(b => {
          const cat = CATEGORIES[b.category];
          const seen = !!sightingMap[b.id];
          return (
            <div key={b.id} onClick={()=>setSelected(b)} style={{
              background:T.card,borderRadius:14,padding:"16px 14px",cursor:"pointer",
              border:`1.5px solid ${seen?cat.color+"55":T.border}`,position:"relative",overflow:"hidden",
              transition:"transform .2s,box-shadow .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,.08)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}
            >
              {seen && <div style={{
                position:"absolute",top:8,right:8,background:T.green,color:T.white,
                borderRadius:16,fontSize:11,fontFamily:fs,fontWeight:600,padding:"2px 8px",
              }}>✓ {sightingMap[b.id]}×</div>}
              {b.custom && <div style={{
                position:"absolute",top:8,left:8,background:T.amber,color:T.white,
                borderRadius:6,fontSize:9,fontFamily:fs,fontWeight:700,padding:"1px 6px",letterSpacing:".5px",
              }}>VLASTNÍ</div>}
              <div style={{ fontSize:28,marginBottom:6,filter:seen?"none":"grayscale(.5) opacity(.55)" }}>{cat.icon}</div>
              <div style={{ fontFamily:ff,fontSize:15,fontWeight:600,color:T.text,lineHeight:1.25,marginBottom:3 }}>{b.name}</div>
              <div style={{ fontFamily:fs,fontSize:11,color:cat.color,fontWeight:600,display:"flex",alignItems:"center",gap:4 }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:cat.color,display:"inline-block" }}/>
                {cat.name}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length===0 && (
        <div style={{ textAlign:"center",padding:48,fontFamily:fs,color:T.textMuted }}>Žádný pták neodpovídá hledání</div>
      )}

      {showAddBird && <AddBirdModal onClose={()=>setShowAddBird(false)} onAdd={onAddBird} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: ADD SIGHTING
   ═══════════════════════════════════════════════ */

function AddPage({ birds, onSave, onCancel, preselected }) {
  const [birdId, setBirdId] = useState(preselected?.id||"");
  const [birdSearch, setBirdSearch] = useState(preselected?.name||"");
  const [showDrop, setShowDrop] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [observer, setObserver] = useState("");
  const [notes, setNotes] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const dropRef = useRef(null);

  const filteredBirds = useMemo(() => {
    if (!birdSearch) return birds;
    const q = birdSearch.toLowerCase();
    return birds.filter(b => b.name.toLowerCase().includes(q));
  }, [birdSearch, birds]);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setGeoLoading(false); },
      () => { setGeoLoading(false); alert("Nepodařilo se zjistit polohu. Zkontrolujte oprávnění."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    if (!birdId || !date) return;
    const bird = birds.find(b => b.id === birdId);
    if (!bird) return;
    onSave({
      id: uid(), birdId: bird.id, birdName: bird.name, birdCategory: bird.category,
      date, location, lat: lat?Number(lat):null, lng: lng?Number(lng):null,
      observer, notes, createdAt: new Date().toISOString(),
    });
  };

  const selectBird = b => { setBirdId(b.id); setBirdSearch(b.name); setShowDrop(false); };

  return (
    <div className="fade-up" style={{ maxWidth:540 }}>
      <h2 style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text,marginBottom:18 }}>Nové pozorování</h2>
      <div style={{ background:T.card,borderRadius:18,padding:24,border:`1.5px solid ${T.border}`,display:"flex",flexDirection:"column",gap:16 }}>

        {/* Bird autocomplete */}
        <div ref={dropRef} style={{ position:"relative" }}>
          <Label>Druh ptáka *</Label>
          <input value={birdSearch}
            onChange={e=>{setBirdSearch(e.target.value);setBirdId("");setShowDrop(true)}}
            onFocus={()=>setShowDrop(true)}
            placeholder="Začněte psát název ptáka…"
            style={{ borderColor:birdId?T.green:undefined }}
          />
          {birdId && <span style={{ position:"absolute",right:12,top:32,fontSize:16 }}>✅</span>}
          {showDrop && (
            <div style={{
              position:"absolute",top:"100%",left:0,right:0,zIndex:50,
              background:T.white,border:`1.5px solid ${T.border}`,borderRadius:10,
              maxHeight:260,overflowY:"auto",marginTop:4,boxShadow:"0 8px 24px rgba(0,0,0,.12)",
            }}>
              {filteredBirds.slice(0,30).map(b => (
                <div key={b.id} onClick={()=>selectBird(b)} style={{
                  padding:"10px 14px",cursor:"pointer",fontFamily:fs,fontSize:14,
                  display:"flex",alignItems:"center",gap:8,
                  background:birdId===b.id?T.greenSoft:"transparent",
                  borderBottom:`1px solid ${T.border}15`,
                }}
                onMouseEnter={e=>e.currentTarget.style.background=T.greenSoft}
                onMouseLeave={e=>e.currentTarget.style.background=birdId===b.id?T.greenSoft:"transparent"}
                >
                  {CATEGORIES[b.category]?.icon} {b.name}
                  {b.custom && <span style={{ fontSize:10,color:T.amber,fontWeight:700,marginLeft:4 }}>(vlastní)</span>}
                </div>
              ))}
              {filteredBirds.length===0 && (
                <div style={{ padding:14,fontFamily:fs,fontSize:13,color:T.textMuted }}>
                  Druh nenalezen — přidejte jej v Atlasu → „+ Nový druh"
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Datum *</Label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        <div>
          <Label>Místo pozorování</Label>
          <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Např. Rybník Velký Dářko, Vysočina" />
        </div>

        {/* GPS */}
        <div>
          <Label>GPS souřadnice</Label>
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Šířka (lat)" style={{ flex:"1 1 90px" }} />
            <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Délka (lng)" style={{ flex:"1 1 90px" }} />
          </div>
          <div style={{ display:"flex",gap:8,marginTop:8 }}>
            <Btn small onClick={handleGeo}>
              {geoLoading?"⏳ Zjišťuji…":"📍 Moje poloha"}
            </Btn>
            <Btn small onClick={()=>setShowMapPicker(true)}>🗺️ Vybrat na mapě</Btn>
          </div>
          {lat && lng && (
            <p style={{ fontFamily:fs,fontSize:12,color:T.green,marginTop:6,fontWeight:500 }}>
              ✅ Souřadnice: {lat}, {lng}
            </p>
          )}
        </div>

        <div>
          <Label>Pozorovatel</Label>
          <input value={observer} onChange={e=>setObserver(e.target.value)} placeholder="Vaše jméno" />
        </div>

        <div>
          <Label>Poznámky</Label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Počasí, chování ptáka, prostředí…" />
        </div>

        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <Btn primary onClick={handleSave} disabled={!birdId||!date} style={{ flex:1 }}>💾 Uložit pozorování</Btn>
          <Btn onClick={onCancel}>Zrušit</Btn>
        </div>
      </div>

      {showMapPicker && (
        <MapPicker
          lat={lat ? Number(lat) : null}
          lng={lng ? Number(lng) : null}
          onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: SIGHTINGS
   ═══════════════════════════════════════════════ */

function ListPage({ sightings, onDelete }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(null);
  const [sortBy, setSortBy] = useState("date-desc");

  const counts = useMemo(() => {
    const c = { all: sightings.length };
    sightings.forEach(s => { c[s.birdCategory]=(c[s.birdCategory]||0)+1; });
    return c;
  }, [sightings]);

  const filtered = useMemo(() => {
    let list = [...sightings];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.birdName.toLowerCase().includes(q) || (s.location||"").toLowerCase().includes(q) || (s.observer||"").toLowerCase().includes(q));
    }
    if (catFilter) list = list.filter(s => s.birdCategory===catFilter);
    list.sort((a,b) => {
      if (sortBy==="date-desc") return new Date(b.date)-new Date(a.date);
      if (sortBy==="date-asc") return new Date(a.date)-new Date(b.date);
      return a.birdName.localeCompare(b.birdName,"cs");
    });
    return list;
  }, [sightings,search,catFilter,sortBy]);

  const exportCSV = () => {
    const h = "Pták;Kategorie;Datum;Místo;Šířka;Délka;Pozorovatel;Poznámky\n";
    const rows = sightings.map(s =>
      [s.birdName,CATEGORIES[s.birdCategory]?.name,s.date,s.location,s.lat,s.lng,s.observer,s.notes]
      .map(v=>`"${(v??"").toString().replace(/"/g,'""')}"`).join(";")
    ).join("\n");
    const blob = new Blob(["\uFEFF"+h+rows],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="ptaci_pozorovani.csv"; a.click();
  };

  return (
    <div className="fade-up">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text }}>Záznamy</h2>
          <p style={{ fontFamily:fs,fontSize:14,color:T.textMuted }}>{sightings.length} pozorování</p>
        </div>
        <Btn small onClick={exportCSV}>📥 Export CSV</Btn>
      </div>
      <div style={{ display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ flex:"1 1 200px" }}><Search value={search} onChange={setSearch} placeholder="Hledat v záznamech…" /></div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ width:"auto",borderRadius:10,padding:"8px 12px" }}>
          <option value="date-desc">Nejnovější</option>
          <option value="date-asc">Nejstarší</option>
          <option value="name">Podle názvu</option>
        </select>
      </div>
      <CatPills selected={catFilter} onChange={setCatFilter} counts={counts} />
      <div style={{ marginTop:14 }}>
        {filtered.length===0 && (
          <div style={{ textAlign:"center",padding:48,fontFamily:fs,color:T.textMuted }}>
            {sightings.length===0?"Zatím žádná pozorování. Začněte v Atlasu!":"Žádné záznamy neodpovídají filtru"}
          </div>
        )}
        {filtered.map(s => {
          const cat = CATEGORIES[s.birdCategory];
          return (
            <div key={s.id} style={{
              background:T.card,borderRadius:14,padding:"14px 18px",border:`1px solid ${T.border}`,
              marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,
            }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3 }}>
                  <span style={{ fontSize:18 }}>{cat?.icon}</span>
                  <span style={{ fontFamily:ff,fontSize:16,fontWeight:600,color:T.text }}>{s.birdName}</span>
                </div>
                <div style={{ fontFamily:fs,fontSize:12,color:T.textMuted,display:"flex",gap:10,flexWrap:"wrap" }}>
                  <span>📅 {fmtDate(s.date)}</span>
                  {s.location && <span>📍 {s.location}</span>}
                  {s.observer && <span>👤 {s.observer}</span>}
                  {s.lat && <span>🌐 {Number(s.lat).toFixed(4)},{Number(s.lng).toFixed(4)}</span>}
                </div>
                {s.notes && <div style={{ fontFamily:fs,fontSize:12,color:T.brownMid,marginTop:5,fontStyle:"italic" }}>„{s.notes}"</div>}
              </div>
              <button onClick={()=>onDelete(s.id)} style={{
                background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.textMuted,opacity:.4,flexShrink:0,
              }} title="Smazat">🗑️</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: STATS
   ═══════════════════════════════════════════════ */

function StatsPage({ sightings, totalBirds }) {
  const stats = useMemo(() => {
    const unique = new Set(sightings.map(s=>s.birdId));
    const catCounts={}, birdCounts={}, monthCounts={}, observerCounts={};
    sightings.forEach(s => {
      catCounts[s.birdCategory]=(catCounts[s.birdCategory]||0)+1;
      birdCounts[s.birdName]=(birdCounts[s.birdName]||0)+1;
      monthCounts[new Date(s.date).getMonth()]=(monthCounts[new Date(s.date).getMonth()]||0)+1;
      if (s.observer) observerCounts[s.observer]=(observerCounts[s.observer]||0)+1;
    });
    return {
      total:sightings.length, unique:unique.size,
      pct:totalBirds>0?Math.round(unique.size/totalBirds*100):0,
      locs:new Set(sightings.map(s=>s.location).filter(Boolean)).size,
      topBirds:Object.entries(birdCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,c])=>({name:n.length>16?n.slice(0,16)+"…":n,count:c})),
      catData:Object.entries(catCounts).map(([k,v])=>({name:CATEGORIES[k]?.name||k,value:v,color:CATEGORIES[k]?.color||"#999"})),
      monthData:Array.from({length:12},(_,i)=>({name:monthName(i),count:monthCounts[i]||0})),
      topObs:Object.entries(observerCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,c])=>({name:n,count:c})),
    };
  }, [sightings, totalBirds]);

  if (!sightings.length) return (
    <div className="fade-up" style={{ textAlign:"center",padding:64 }}>
      <div style={{ fontSize:52,marginBottom:12 }}>📊</div>
      <h2 style={{ fontFamily:ff,fontSize:24,color:T.text,marginBottom:8 }}>Zatím žádná data</h2>
      <p style={{ fontFamily:fs,color:T.textMuted }}>Přidejte pozorování a statistiky se zobrazí.</p>
    </div>
  );

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:ff,fontSize:28,fontWeight:700,color:T.text,marginBottom:18 }}>Statistiky</h2>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:24 }}>
        <Stat icon="🐦" value={stats.unique} sub={`z ${totalBirds} druhů (${stats.pct} %)`} color={T.green} />
        <Stat icon="👁️" value={stats.total} sub="pozorování celkem" color={T.amber} />
        <Stat icon="📍" value={stats.locs} sub="různých míst" color={T.brownMid} />
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:18 }}>
        <div style={{ background:T.card,borderRadius:16,padding:20,border:`1px solid ${T.border}` }}>
          <h3 style={{ fontFamily:ff,fontSize:17,fontWeight:600,marginBottom:14,color:T.text }}>Nejčastější druhy</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={stats.topBirds} layout="vertical" margin={{left:4,right:12}}>
              <XAxis type="number" allowDecimals={false} tick={{fontFamily:fs,fontSize:11}} />
              <YAxis type="category" dataKey="name" width={115} tick={{fontFamily:fs,fontSize:11}} />
              <Tooltip contentStyle={{fontFamily:fs,borderRadius:8}} />
              <Bar dataKey="count" fill={T.green} radius={[0,5,5,0]} name="Počet" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:20,border:`1px solid ${T.border}` }}>
          <h3 style={{ fontFamily:ff,fontSize:17,fontWeight:600,marginBottom:14,color:T.text }}>Podle kategorií</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={stats.catData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} innerRadius={42} paddingAngle={3}
                label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                style={{fontFamily:fs,fontSize:11}}>
                {stats.catData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip contentStyle={{fontFamily:fs,borderRadius:8}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:T.card,borderRadius:16,padding:20,border:`1px solid ${T.border}`,gridColumn:"1/-1" }}>
          <h3 style={{ fontFamily:ff,fontSize:17,fontWeight:600,marginBottom:14,color:T.text }}>Pozorování v průběhu roku</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{fontFamily:fs,fontSize:11}} />
              <YAxis allowDecimals={false} tick={{fontFamily:fs,fontSize:11}} />
              <Tooltip contentStyle={{fontFamily:fs,borderRadius:8}} />
              <Bar dataKey="count" fill={T.amber} radius={[4,4,0,0]} name="Pozorování" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {stats.topObs.length>1 && (
          <div style={{ background:T.card,borderRadius:16,padding:20,border:`1px solid ${T.border}` }}>
            <h3 style={{ fontFamily:ff,fontSize:17,fontWeight:600,marginBottom:14,color:T.text }}>Žebříček pozorovatelů</h3>
            {stats.topObs.map((o,i)=>(
              <div key={o.name} style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"10px 0",borderBottom:i<stats.topObs.length-1?`1px solid ${T.border}`:"none",
              }}>
                <span style={{ fontFamily:fs,fontSize:14,color:T.text }}>{["🥇","🥈","🥉"][i]||"  "} {o.name}</span>
                <span style={{ fontFamily:ff,fontSize:18,fontWeight:700,color:T.green }}>{o.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */

const TABS = [
  { id:"atlas", label:"Atlas", icon:"📖" },
  { id:"add", label:"Nový záznam", icon:"➕" },
  { id:"sightings", label:"Záznamy", icon:"📋" },
  { id:"map", label:"Mapa", icon:"🗺️" },
  { id:"stats", label:"Statistiky", icon:"📊" },
];

export default function App() {
  const [page, setPage] = useState("atlas");
  const [sightings, setSightings] = useState([]);
  const [customBirds, setCustomBirds] = useState([]);
  const [preselected, setPreselected] = useState(null);

  const allBirds = useMemo(() => [...BIRDS_BUILTIN, ...customBirds], [customBirds]);

  useEffect(() => {
    setSightings(STORE.get("ptaci-sightings") || []);
    setCustomBirds(STORE.get("ptaci-custom-birds") || []);
  }, []);

  const save = useCallback((s) => {
    const u = [...sightings, s];
    setSightings(u); STORE.set("ptaci-sightings", u);
    setPreselected(null); setPage("sightings");
  }, [sightings]);

  const del = useCallback((id) => {
    const u = sightings.filter(s=>s.id!==id);
    setSightings(u); STORE.set("ptaci-sightings", u);
  }, [sightings]);

  const addBird = useCallback((b) => {
    const u = [...customBirds, b];
    setCustomBirds(u); STORE.set("ptaci-custom-birds", u);
  }, [customBirds]);

  const goAdd = useCallback((bird) => { setPreselected(bird||null); setPage("add"); }, []);

  return (
    <div style={{ minHeight:"100vh",background:T.bg }}>
      <style>{CSS}</style>

      <header style={{
        background:`linear-gradient(145deg,${T.dark},${T.darkMid})`,
        padding:"18px 20px 0",position:"sticky",top:0,zIndex:40,
        boxShadow:"0 2px 16px rgba(0,0,0,.18)",
      }}>
        <div style={{ maxWidth:920,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <span style={{ fontSize:26 }}>🪶</span>
            <h1 style={{ fontFamily:ff,fontSize:24,fontWeight:700,color:T.cream,letterSpacing:"-.3px" }}>Ptačí deník</h1>
            <span style={{
              fontFamily:fs,fontSize:10,fontWeight:600,color:"rgba(255,255,255,.5)",
              background:"rgba(255,255,255,.1)",padding:"2px 10px",borderRadius:10,
            }}>rodinný · {allBirds.length} druhů</span>
          </div>
          <nav style={{ display:"flex",gap:2,overflowX:"auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>{setPage(t.id);setPreselected(null)}} style={{
                fontFamily:fs,fontSize:13,fontWeight:600,padding:"9px 16px",
                borderRadius:"10px 10px 0 0",border:"none",cursor:"pointer",whiteSpace:"nowrap",
                background:page===t.id?T.bg:"transparent",
                color:page===t.id?T.green:"rgba(255,255,255,.55)",
                transition:"all .2s",
              }}>{t.icon} {t.label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth:920,margin:"0 auto",padding:"22px 16px 60px" }}>
        {page==="atlas" && <AtlasPage birds={allBirds} sightings={sightings} onAddSighting={goAdd} onAddBird={addBird} />}
        {page==="add" && <AddPage birds={allBirds} preselected={preselected} onSave={save} onCancel={()=>setPage("atlas")} />}
        {page==="sightings" && <ListPage sightings={sightings} onDelete={del} />}
        {page==="map" && <SightingsMap sightings={sightings} />}
        {page==="stats" && <StatsPage sightings={sightings} totalBirds={allBirds.length} />}
      </main>
    </div>
  );
}
