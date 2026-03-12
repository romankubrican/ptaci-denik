import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════
   SUPABASE
   ═══════════════════════════════════════════════ */

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
   STORAGE (only for observer name preference)
   ═══════════════════════════════════════════════ */

const STORE = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(e); }
  },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : "";
const monthName = m => ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"][m];

// Map Supabase bird row → app bird object
const mapBird = (row) => ({
  id: row.id,
  name: row.name_cs,
  category: row.category,
  latin: row.name_latin || null,
  custom: row.is_custom || false,
});

// Map Supabase sighting row → app sighting object
const mapSighting = (row) => ({
  id: row.id,
  birdId: row.bird_id,
  birdName: row.bird_name,
  birdCategory: row.bird_category,
  date: row.date,
  location: row.location || "",
  lat: row.lat || null,
  lng: row.lng || null,
  observer: row.observer || "",
  notes: row.notes || "",
  photoUrl: row.photo_url || null,
  createdAt: row.created_at,
});

/* ═══════════════════════════════════════════════
   RESPONSIVE CSS (Mobile-first)
   ═══════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;overflow-x:hidden}
html,body,#root{min-height:100vh;min-height:100dvh}
body{background:${T.bg};font-family:${fs};overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}

input,select,textarea{
  font-family:${fs};font-size:16px;border:1.5px solid ${T.border};border-radius:10px;
  padding:12px 14px;background:${T.white};color:${T.text};outline:none;width:100%;
  transition:border .2s,box-shadow .2s;-webkit-appearance:none;
}
input:focus,select:focus,textarea:focus{border-color:${T.green};box-shadow:0 0 0 3px ${T.greenSoft}}
textarea{resize:vertical;min-height:60px}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp .35s ease-out both}

.leaflet-container{border-radius:14px !important}

.bottom-nav{
  display:none;
  position:fixed;bottom:0;left:0;right:0;z-index:50;
  background:${T.white};border-top:1px solid ${T.border};
  padding:6px 0 env(safe-area-inset-bottom,8px);
  box-shadow:0 -2px 12px rgba(0,0,0,.08);
}
.bottom-nav button{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
  background:none;border:none;cursor:pointer;padding:6px 2px;
  font-family:${fs};font-size:10px;font-weight:600;color:${T.textMuted};
  transition:color .2s;
}
.bottom-nav button.active{color:${T.green}}
.bottom-nav button .nav-icon{font-size:20px;line-height:1}

.top-nav{display:flex;gap:2px;overflow-x:auto}
.top-nav button{
  font-family:${fs};font-size:13px;font-weight:600;padding:9px 16px;
  border-radius:10px 10px 0 0;border:none;cursor:pointer;white-space:nowrap;
  transition:all .2s;
}

@media(max-width:640px){
  .bottom-nav{display:flex !important}
  .top-nav{display:none !important}
  .desktop-header-spacer{display:none !important}
  main.main-content{padding-bottom:80px !important}
}

.bird-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(155px,1fr));
  gap:10px;
}
@media(max-width:400px){
  .bird-grid{grid-template-columns:repeat(2,1fr);gap:8px}
}

.stats-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
  gap:16px;
}
@media(max-width:640px){
  .stats-grid{grid-template-columns:1fr}
}

.pill-row{display:flex;gap:5px;flex-wrap:wrap}
@media(max-width:640px){
  .pill-row{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  .pill-row::-webkit-scrollbar{display:none}
}

@media(max-width:640px){
  .touch-btn{min-height:44px !important;min-width:44px !important}
}
`;

/* ═══════════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════════ */

function Btn({ children, onClick, primary, small, disabled, style: sx, className }) {
  const base = {
    fontFamily: fs, fontWeight: 600, borderRadius: 10, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all .2s",
    opacity: disabled ? .45 : 1, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 6,
    fontSize: small ? 13 : 14, padding: small ? "8px 14px" : "12px 22px",
  };
  const v = primary
    ? { background: T.green, color: T.white, boxShadow: "0 2px 10px rgba(61,122,52,.3)" }
    : { background: T.white, color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` };
  return <button disabled={disabled} onClick={onClick} className={className || "touch-btn"} style={{ ...base, ...v, ...sx }}>{children}</button>;
}

function Search({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: .35 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ paddingLeft: 40, borderRadius: 12, height: 48 }} />
    </div>
  );
}

function CatPills({ selected, onChange, counts }) {
  const pill = (key, label, color, active) => (
    <button key={key} onClick={() => onChange(key === selected ? null : key)} style={{
      fontFamily: fs, fontSize: 12, fontWeight: 600, padding: "7px 13px", borderRadius: 20,
      border: `1.5px solid ${active ? color : T.border}`, cursor: "pointer",
      background: active ? color + "18" : T.white, color: active ? color : T.textMuted,
      transition: "all .2s", whiteSpace: "nowrap", flexShrink: 0,
    }}>{label}</button>
  );
  return (
    <div className="pill-row">
      {pill(null, `Vše (${counts.all || 0})`, T.green, !selected)}
      {Object.entries(CATEGORIES).map(([k, c]) => pill(k, `${c.icon} ${c.name} (${counts[k] || 0})`, c.color, selected === k))}
    </div>
  );
}

function Stat({ icon, value, sub, color }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: "16px 14px", border: `1.5px solid ${T.border}`, flex: "1 1 120px", minWidth: 100 }}>
      <div style={{ fontSize: 24, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: color || T.text }}>{value}</div>
      <div style={{ fontFamily: fs, fontSize: 11, color: T.textMuted, marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ fontFamily: fs, fontSize: 13, fontWeight: 600, color: T.brownMid, marginBottom: 4, display: "block" }}>{children}</label>;
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

    const map = L.map(mapRef.current, { scrollWheelZoom: true, tap: true }).setView([49.75, 15.5], 7);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    withCoords.forEach(s => {
      const cat = CATEGORIES[s.birdCategory];
      const icon = L.divIcon({
        html: `<div style="font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));line-height:1">${cat?.icon || "🐦"}</div>`,
        className: "", iconSize: [32, 32], iconAnchor: [16, 16],
      });
      L.marker([s.lat, s.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;min-width:140px;line-height:1.5">
          <strong style="font-size:15px">${s.birdName}</strong><br/>
          <span style="font-size:12px;color:#666">📅 ${fmtDate(s.date)}</span><br/>
          ${s.location ? `<span style="font-size:12px;color:#666">📍 ${s.location}</span><br/>` : ""}
          ${s.observer ? `<span style="font-size:12px;color:#666">👤 ${s.observer}</span>` : ""}
        </div>`);
    });

    if (withCoords.length > 0) {
      map.fitBounds(L.latLngBounds(withCoords.map(s => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 13 });
    }

    setTimeout(() => map.invalidateSize(), 250);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [withCoords]);

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 4 }}>Mapa pozorování</h2>
      <p style={{ fontFamily: fs, fontSize: 14, color: T.textMuted, marginBottom: 16 }}>
        {withCoords.length} pozorování se souřadnicemi z celkem {sightings.length}
      </p>
      {withCoords.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 16, padding: "40px 20px", textAlign: "center", border: `1.5px solid ${T.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ fontFamily: fs, color: T.textMuted, lineHeight: 1.6 }}>
            Zatím žádná pozorování s GPS.<br />
            Při přidávání záznamu klikněte na <strong>📍 Moje poloha</strong><br />nebo vyberte místo na mapě.
          </p>
        </div>
      ) : (
        <div ref={mapRef} style={{
          height: "min(500px, 65vh)", borderRadius: 16, border: `1.5px solid ${T.border}`,
          overflow: "hidden", background: T.card,
        }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAP PICKER
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

    const map = L.map(mapRef.current, { tap: true }).setView([initLat, initLng], initZoom);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OSM', maxZoom: 18,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    map.on("click", (e) => {
      const { lat: nLat, lng: nLng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([nLat, nLng]).addTo(map);
      onSelect(nLat.toFixed(6), nLng.toFixed(6));
    });

    setTimeout(() => map.invalidateSize(), 200);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0,
    }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        background: T.card, borderRadius: "20px 20px 0 0", padding: "16px 16px 20px", width: "100%",
        maxWidth: 640, maxHeight: "85vh",
        boxShadow: "0 -10px 40px rgba(0,0,0,.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: ff, fontSize: 18, fontWeight: 700, color: T.text }}>📍 Klikněte na místo pozorování</h3>
          <Btn small onClick={onClose}>✕</Btn>
        </div>
        <div ref={mapRef} style={{
          height: "min(420px, 60vh)", borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`,
        }} />
        <p style={{ fontFamily: fs, fontSize: 12, color: T.textMuted, marginTop: 8, textAlign: "center" }}>
          Klikněte / ťukněte na mapu pro umístění špendlíku
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AI ATLAS
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      cache.current[birdName] = parsed;
      setInfo(parsed);
    } catch (e) {
      setError("Nepodařilo se načíst atlas. Zkontrolujte ANTHROPIC_API_KEY v nastavení Vercelu.");
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
        borderRadius: 14, padding: "18px 16px", marginTop: 16, border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          <h4 style={{ fontFamily: ff, fontSize: 17, fontWeight: 600, color: T.text }}>📚 AI Atlas</h4>
          <span style={{ fontFamily: fs, fontSize: 13, fontStyle: "italic", color: T.brownMid }}>{info.latin}</span>
        </div>
        {fields.map(([label, val]) => val && (
          <div key={label} style={{ marginBottom: 7 }}>
            <span style={{ fontFamily: fs, fontSize: 12, fontWeight: 700, color: T.greenText }}>{label}</span>
            <p style={{ fontFamily: fs, fontSize: 14, color: T.text, lineHeight: 1.45, margin: "2px 0 0" }}>{val}</p>
          </div>
        ))}
        <div style={{ fontFamily: fs, fontSize: 11, color: T.textMuted, marginTop: 10, fontStyle: "italic" }}>
          ℹ️ Generováno AI — doporučujeme ověřit v odborné literatuře
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, fontFamily: fs, color: T.textMuted }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 20 }}>🔄</span>
          <div style={{ marginTop: 6 }}>Načítám informace z atlasu…</div>
        </div>
      ) : error ? (
        <div style={{ fontFamily: fs, fontSize: 13, color: T.accent, padding: "10px 0" }}>{error}</div>
      ) : (
        <Btn small onClick={fetchInfo} style={{ width: "100%" }}>📚 Zobrazit info z AI atlasu</Btn>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ADD BIRD MODAL
   ═══════════════════════════════════════════════ */

function AddBirdModal({ onClose, onAdd, existingBirds }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("pevci");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const debounceRef = useRef(null);

  const searchAI = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      const filtered = (data.suggestions || []).filter(
        s => !existingBirds.some(b => b.name.toLowerCase() === s.name.toLowerCase())
      );
      setSuggestions(filtered);
    } catch { setSuggestions([]); }
    setLoading(false);
  };

  const handleInput = (val) => {
    setQuery(val);
    setSelectedSuggestion(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAI(val), 400);
  };

  const pickSuggestion = (s) => {
    setSelectedSuggestion(s);
    setQuery(s.name);
    setCategory(s.category || "pevci");
    setSuggestions([]);
  };

  const handleAdd = () => {
    const name = selectedSuggestion?.name || query.trim();
    if (!name) return;
    const cat = selectedSuggestion?.category || category;
    const latin = selectedSuggestion?.latin || null;
    onAdd({ name, category: cat, latin, custom: true });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 150,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        background: T.card, borderRadius: "20px 20px 0 0", padding: "24px 20px 32px",
        width: "100%", maxWidth: 440, boxShadow: "0 -10px 40px rgba(0,0,0,.2)",
      }}>
        <h3 style={{ fontFamily: ff, fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>Přidat nový druh</h3>
        <p style={{ fontFamily: fs, fontSize: 13, color: T.textMuted, marginBottom: 16 }}>
          Začněte psát a AI atlas navrhne ptáky z české ornitologie
        </p>
        <div style={{ marginBottom: 14, position: "relative" }}>
          <Label>Název druhu *</Label>
          <input value={query} onChange={e => handleInput(e.target.value)}
            placeholder="Začněte psát, např. 'orel', 'sýk', 'čáp'…" autoFocus />
          {loading && <span style={{
            position: "absolute", right: 14, top: 34, fontSize: 14,
            animation: "spin 1s linear infinite", display: "inline-block",
          }}>🔄</span>}
          {selectedSuggestion && <span style={{ position: "absolute", right: 14, top: 34, fontSize: 16 }}>✅</span>}

          {suggestions.length > 0 && (
            <div style={{
              background: T.white, border: `1.5px solid ${T.green}`, borderRadius: 10,
              maxHeight: 200, overflowY: "auto", marginTop: 4,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            }}>
              <div style={{ padding: "6px 12px", fontFamily: fs, fontSize: 11, color: T.green, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>
                📚 Návrhy z AI atlasu:
              </div>
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => pickSuggestion(s)} style={{
                  padding: "11px 14px", cursor: "pointer", fontFamily: fs, fontSize: 14,
                  display: "flex", alignItems: "center", gap: 8,
                  borderBottom: `1px solid ${T.border}22`,
                  WebkitTapHighlightColor: "transparent",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = T.greenSoft}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span>{CATEGORIES[s.category]?.icon || "🐦"}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.latin && <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>{s.latin}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectedSuggestion && query.length >= 2 && !loading && (
          <div style={{ marginBottom: 14 }}>
            <Label>Kategorie</Label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        )}

        {selectedSuggestion && (
          <div style={{
            background: T.greenSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
            fontFamily: fs, fontSize: 13, color: T.greenText,
          }}>
            ✅ <strong>{selectedSuggestion.name}</strong>
            {selectedSuggestion.latin && <span style={{ fontStyle: "italic" }}> ({selectedSuggestion.latin})</span>}
            {" · "}{CATEGORIES[selectedSuggestion.category]?.icon} {CATEGORIES[selectedSuggestion.category]?.name}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Btn primary onClick={handleAdd} disabled={!query.trim()} style={{ flex: 1 }}>✓ Přidat druh</Btn>
          <Btn onClick={onClose}>Zrušit</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════ */

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 300,
      background: T.dark, color: T.white, fontFamily: fs, fontSize: 14, fontWeight: 600,
      padding: "12px 24px", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.25)",
      animation: "fadeUp .3s ease-out",
    }}>{message}</div>
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
    sightings.forEach(s => { m[s.birdId] = (m[s.birdId] || 0) + 1; });
    return m;
  }, [sightings]);

  const counts = useMemo(() => {
    const c = { all: birds.length };
    birds.forEach(b => { c[b.category] = (c[b.category] || 0) + 1; });
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
    return sightings.filter(s => s.birdId === selected.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selected, sightings]);

  if (selected) {
    const cat = CATEGORIES[selected.category];
    return (
      <div className="fade-up">
        <button onClick={() => setSelected(null)} style={{
          fontFamily: fs, fontSize: 14, color: T.green, background: "none", border: "none",
          cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
        }}>← Zpět na atlas</button>
        <div style={{
          background: `linear-gradient(135deg,${cat.color}12,${cat.color}06)`,
          borderRadius: 18, padding: "24px 20px", border: `1.5px solid ${cat.color}30`, marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 44 }}>{cat.icon}</span>
            {selected.custom && <span style={{
              fontFamily: fs, fontSize: 10, fontWeight: 700, color: T.amber, background: T.amberSoft,
              padding: "2px 8px", borderRadius: 8,
            }}>VLASTNÍ DRUH</span>}
          </div>
          <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 6 }}>{selected.name}</h2>
          <span style={{
            fontFamily: fs, fontSize: 12, color: cat.color, fontWeight: 600,
            background: cat.color + "18", padding: "4px 12px", borderRadius: 12,
          }}>{cat.name}</span>
          <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text }}>{sightingMap[selected.id] || 0}</div>
              <div style={{ fontFamily: fs, fontSize: 13, color: T.textMuted }}>pozorování</div>
            </div>
            {birdSightings.length > 0 && <div>
              <div style={{ fontFamily: fs, fontSize: 16, fontWeight: 700, color: T.text }}>{fmtDate(birdSightings[0].date)}</div>
              <div style={{ fontFamily: fs, fontSize: 13, color: T.textMuted }}>poslední</div>
            </div>}
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn primary onClick={() => onAddSighting(selected)} style={{ width: "100%" }}>+ Zaznamenat pozorování</Btn>
          </div>
        </div>

        <BirdInfoPanel birdName={selected.name} />

        {birdSightings.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontFamily: ff, fontSize: 19, fontWeight: 600, color: T.text, marginBottom: 12 }}>Historie pozorování</h3>
            {birdSightings.map(s => (
              <div key={s.id} style={{
                background: T.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${T.border}`, marginBottom: 8,
              }}>
                <div style={{ fontFamily: fs, fontWeight: 600, fontSize: 14, color: T.text }}>📍 {s.location || "Neznámé místo"}</div>
                <div style={{ fontFamily: fs, fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  {fmtDate(s.date)} {s.observer ? `· 👤 ${s.observer}` : ""}
                  {s.lat ? ` · 🌐 ${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}` : ""}
                </div>
                {s.notes && <div style={{ fontFamily: fs, fontSize: 12, color: T.brownMid, marginTop: 5, fontStyle: "italic" }}>„{s.notes}"</div>}
                {s.photoUrl && (
                  <img src={s.photoUrl} alt={s.birdName} style={{
                    marginTop: 8, width: "100%", maxHeight: 200, objectFit: "cover",
                    borderRadius: 10, border: `1px solid ${T.border}`,
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 2 }}>Atlas ptáků</h2>
          <p style={{ fontFamily: fs, fontSize: 14, color: T.textMuted }}>
            {birds.length} druhů · {Object.keys(sightingMap).length} spatřeno ({birds.length > 0 ? Math.round(Object.keys(sightingMap).length / birds.length * 100) : 0} %)
          </p>
        </div>
        <Btn small onClick={() => setShowAddBird(true)}>+ Nový druh</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Search value={search} onChange={setSearch} placeholder="Hledat ptáka…" />
        <CatPills selected={catFilter} onChange={setCatFilter} counts={counts} />
        <label style={{ fontFamily: fs, fontSize: 13, color: T.textMuted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showOnlySeen} onChange={e => setShowOnlySeen(e.target.checked)}
            style={{ width: "auto", accentColor: T.green }} /> Jen spatřené
        </label>
      </div>

      <div className="bird-grid">
        {filtered.map(b => {
          const cat = CATEGORIES[b.category];
          const seen = !!sightingMap[b.id];
          return (
            <div key={b.id} onClick={() => setSelected(b)} style={{
              background: T.card, borderRadius: 14, padding: "14px 12px", cursor: "pointer",
              border: `1.5px solid ${seen ? cat.color + "55" : T.border}`, position: "relative", overflow: "hidden",
              transition: "transform .15s,box-shadow .15s", WebkitTapHighlightColor: "transparent",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,.07)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
            >
              {seen && <div style={{
                position: "absolute", top: 7, right: 7, background: T.green, color: T.white,
                borderRadius: 14, fontSize: 10, fontFamily: fs, fontWeight: 600, padding: "2px 7px",
              }}>✓ {sightingMap[b.id]}×</div>}
              {b.custom && <div style={{
                position: "absolute", top: 7, left: 7, background: T.amber, color: T.white,
                borderRadius: 5, fontSize: 8, fontFamily: fs, fontWeight: 700, padding: "1px 5px",
              }}>VLASTNÍ</div>}
              <div style={{ fontSize: 26, marginBottom: 5, filter: seen ? "none" : "grayscale(.5) opacity(.5)" }}>{cat.icon}</div>
              <div style={{ fontFamily: ff, fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.2, marginBottom: 3 }}>{b.name}</div>
              <div style={{ fontFamily: fs, fontSize: 10, color: cat.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, display: "inline-block" }} />
                {cat.name}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, fontFamily: fs, color: T.textMuted }}>Žádný pták neodpovídá hledání</div>
      )}

      {showAddBird && <AddBirdModal onClose={() => setShowAddBird(false)} onAdd={onAddBird} existingBirds={birds} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: ADD SIGHTING
   ═══════════════════════════════════════════════ */

function AddPage({ birds, onSave, onCancel, preselected, onAddBird }) {
  const [birdId, setBirdId] = useState(preselected?.id || "");
  const [birdSearch, setBirdSearch] = useState(preselected?.name || "");
  const [showDrop, setShowDrop] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [observer, setObserver] = useState(() => STORE.get("ptaci-last-observer") || "");
  const [notes, setNotes] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const dropRef = useRef(null);
  const aiDebounce = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const filteredBirds = useMemo(() => {
    if (!birdSearch) return birds;
    const q = birdSearch.toLowerCase();
    return birds.filter(b => b.name.toLowerCase().includes(q));
  }, [birdSearch, birds]);

  const searchAI = async (q) => {
    if (q.length < 2) { setAiSuggestions([]); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      const filtered = (data.suggestions || []).filter(
        s => !birds.some(b => b.name.toLowerCase() === s.name.toLowerCase())
      );
      setAiSuggestions(filtered);
    } catch { setAiSuggestions([]); }
    setAiLoading(false);
  };

  const handleBirdInput = (val) => {
    setBirdSearch(val); setBirdId(""); setShowDrop(true);
    setAiSuggestions([]);
    if (aiDebounce.current) clearTimeout(aiDebounce.current);
    if (val.length >= 2) {
      aiDebounce.current = setTimeout(() => searchAI(val), 600);
    }
  };

  const addAndSelectAiBird = async (s) => {
    const newBird = await onAddBird({ name: s.name, category: s.category || "pevci", latin: s.latin, custom: true });
    if (newBird) {
      setBirdId(newBird.id); setBirdSearch(newBird.name);
    }
    setShowDrop(false); setAiSuggestions([]);
  };

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  const handleGeo = () => {
    if (!navigator.geolocation) { alert("Geolokace není podporována."); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setGeoLoading(false); },
      () => { setGeoLoading(false); alert("Nepodařilo se zjistit polohu. Povolte přístup k poloze."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!birdId || !date) return;
    const bird = birds.find(b => b.id === birdId);
    if (!bird) return;
    STORE.set("ptaci-last-observer", observer);
    let photoUrl = null;
    if (photo) {
      setPhotoUploading(true);
      const ext = photo.name.split(".").pop();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from("sighting-photos").upload(path, photo, { contentType: photo.type });
      setPhotoUploading(false);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("sighting-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }
    onSave({
      bird_id: bird.id, bird_name: bird.name, bird_category: bird.category,
      date, location, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
      observer, notes, photo_url: photoUrl,
    });
  };

  const selectBird = b => { setBirdId(b.id); setBirdSearch(b.name); setShowDrop(false); };

  return (
    <div className="fade-up" style={{ maxWidth: 540 }}>
      <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 16 }}>Nové pozorování</h2>
      <div style={{ background: T.card, borderRadius: 18, padding: "20px 16px", border: `1.5px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 14 }}>

        <div ref={dropRef} style={{ position: "relative" }}>
          <Label>Druh ptáka *</Label>
          <div style={{ position: "relative" }}>
            <input value={birdSearch}
              onChange={e => handleBirdInput(e.target.value)}
              onFocus={() => setShowDrop(true)}
              placeholder="Začněte psát název ptáka…"
              style={{ borderColor: birdId ? T.green : undefined, paddingRight: 40 }}
            />
            {birdId && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18 }}>✅</span>}
          </div>
          {showDrop && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 10,
              maxHeight: 220, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            }}>
              {filteredBirds.slice(0, 30).map(b => (
                <div key={b.id} onClick={() => selectBird(b)} style={{
                  padding: "12px 14px", cursor: "pointer", fontFamily: fs, fontSize: 15,
                  display: "flex", alignItems: "center", gap: 8,
                  background: birdId === b.id ? T.greenSoft : "transparent",
                  borderBottom: `1px solid ${T.border}22`,
                }}>
                  {CATEGORIES[b.category]?.icon} {b.name}
                  {b.custom && <span style={{ fontSize: 10, color: T.amber, fontWeight: 700 }}>(vlastní)</span>}
                </div>
              ))}
              {filteredBirds.length === 0 && aiSuggestions.length === 0 && !aiLoading && birdSearch.length >= 2 && (
                <div style={{ padding: 14, fontFamily: fs, fontSize: 13, color: T.textMuted }}>
                  Druh nenalezen — přidejte v Atlasu → „+ Nový druh"
                </div>
              )}
              {aiLoading && (
                <div style={{ padding: 14, fontFamily: fs, fontSize: 13, color: T.textMuted, textAlign: "center" }}>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span> Hledám v AI atlasu…
                </div>
              )}
              {aiSuggestions.length > 0 && (
                <>
                  <div style={{ padding: "8px 14px", fontFamily: fs, fontSize: 11, color: T.green, fontWeight: 700, background: T.greenSoft + "80" }}>
                    📚 Návrhy z AI atlasu (kliknutím přidáte):
                  </div>
                  {aiSuggestions.map((s, i) => (
                    <div key={`ai-${i}`} onClick={() => addAndSelectAiBird(s)} style={{
                      padding: "11px 14px", cursor: "pointer", fontFamily: fs, fontSize: 14,
                      display: "flex", alignItems: "center", gap: 8,
                      background: T.amberSoft + "60", borderBottom: `1px solid ${T.border}22`,
                    }}>
                      <span>{CATEGORIES[s.category]?.icon || "🐦"}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {s.latin && <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>{s.latin}</div>}
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: T.amber, fontWeight: 700 }}>+ PŘIDAT</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Datum *</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div>
          <Label>Místo pozorování</Label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Např. Rybník u Lipnice" />
        </div>

        <div>
          <Label>Poloha GPS</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Btn small onClick={handleGeo} style={{ flex: 1 }}>
              {geoLoading ? "⏳ Zjišťuji…" : "📍 Moje poloha"}
            </Btn>
            <Btn small onClick={() => setShowMapPicker(true)} style={{ flex: 1 }}>
              🗺️ Vybrat na mapě
            </Btn>
          </div>
          {(lat && lng) ? (
            <div style={{
              background: T.greenSoft, borderRadius: 10, padding: "10px 14px",
              fontFamily: fs, fontSize: 13, color: T.greenText, fontWeight: 500,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>✅ {lat}, {lng}</span>
              <button onClick={() => { setLat(""); setLng(""); }} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textMuted,
              }}>✕</button>
            </div>
          ) : (
            <p style={{ fontFamily: fs, fontSize: 12, color: T.textMuted }}>
              Klikněte na tlačítko pro zjištění polohy nebo vyberte na mapě
            </p>
          )}
        </div>

        <div>
          <Label>Pozorovatel</Label>
          <input value={observer} onChange={e => setObserver(e.target.value)} placeholder="Vaše jméno" />
        </div>

        <div>
          <Label>Poznámky</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Počasí, chování ptáka…" />
        </div>

        <div>
          <Label>Fotografie</Label>
          <input
            ref={photoInputRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
          {photoPreview ? (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} alt="Náhled" style={{
                width: "100%", maxHeight: 220, objectFit: "cover",
                borderRadius: 12, border: `1.5px solid ${T.border}`,
              }} />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{
                position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)",
                color: T.white, border: "none", borderRadius: 20, padding: "4px 10px",
                cursor: "pointer", fontFamily: fs, fontSize: 12,
              }}>✕ Odebrat</button>
            </div>
          ) : (
            <Btn small onClick={() => photoInputRef.current?.click()} style={{ width: "100%" }}>
              📷 Vyfotit / nahrát fotku
            </Btn>
          )}
        </div>

        <Btn primary onClick={handleSave} disabled={!birdId || !date || photoUploading} style={{ width: "100%", marginTop: 4 }}>
          {photoUploading ? "⏳ Nahrávám fotku…" : "💾 Uložit pozorování"}
        </Btn>
        <Btn onClick={onCancel} style={{ width: "100%" }}>Zrušit</Btn>
      </div>

      {showMapPicker && (
        <MapPicker
          lat={lat ? Number(lat) : null}
          lng={lng ? Number(lng) : null}
          onSelect={(nLat, nLng) => { setLat(nLat); setLng(nLng); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE: SIGHTINGS LIST
   ═══════════════════════════════════════════════ */

function ListPage({ sightings, onDelete }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(null);
  const [sortBy, setSortBy] = useState("date-desc");

  const counts = useMemo(() => {
    const c = { all: sightings.length };
    sightings.forEach(s => { c[s.birdCategory] = (c[s.birdCategory] || 0) + 1; });
    return c;
  }, [sightings]);

  const filtered = useMemo(() => {
    let list = [...sightings];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.birdName.toLowerCase().includes(q) || (s.location || "").toLowerCase().includes(q) || (s.observer || "").toLowerCase().includes(q));
    }
    if (catFilter) list = list.filter(s => s.birdCategory === catFilter);
    list.sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      return a.birdName.localeCompare(b.birdName, "cs");
    });
    return list;
  }, [sightings, search, catFilter, sortBy]);

  const exportCSV = () => {
    const h = "Pták;Kategorie;Datum;Místo;Šířka;Délka;Pozorovatel;Poznámky\n";
    const rows = sightings.map(s =>
      [s.birdName, CATEGORIES[s.birdCategory]?.name, s.date, s.location, s.lat, s.lng, s.observer, s.notes]
        .map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(";")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + h + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ptaci_pozorovani.csv"; a.click();
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text }}>Záznamy</h2>
          <p style={{ fontFamily: fs, fontSize: 14, color: T.textMuted }}>{sightings.length} pozorování</p>
        </div>
        <Btn small onClick={exportCSV}>📥 CSV</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 180px" }}><Search value={search} onChange={setSearch} placeholder="Hledat…" /></div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", borderRadius: 10, padding: "10px 12px" }}>
          <option value="date-desc">Nejnovější</option>
          <option value="date-asc">Nejstarší</option>
          <option value="name">Podle názvu</option>
        </select>
      </div>
      <CatPills selected={catFilter} onChange={setCatFilter} counts={counts} />
      <div style={{ marginTop: 12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, fontFamily: fs, color: T.textMuted }}>
            {sightings.length === 0 ? "Zatím žádná pozorování." : "Žádné záznamy neodpovídají filtru"}
          </div>
        )}
        {filtered.map(s => {
          const cat = CATEGORIES[s.birdCategory];
          return (
            <div key={s.id} style={{
              background: T.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${T.border}`,
              marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                  <span style={{ fontFamily: ff, fontSize: 15, fontWeight: 600, color: T.text }}>{s.birdName}</span>
                </div>
                <div style={{ fontFamily: fs, fontSize: 12, color: T.textMuted, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>📅 {fmtDate(s.date)}</span>
                  {s.location && <span>📍 {s.location}</span>}
                  {s.observer && <span>👤 {s.observer}</span>}
                  {s.lat && <span>🌐 {Number(s.lat).toFixed(3)},{Number(s.lng).toFixed(3)}</span>}
                </div>
                {s.notes && <div style={{ fontFamily: fs, fontSize: 12, color: T.brownMid, marginTop: 4, fontStyle: "italic" }}>„{s.notes}"</div>}
                {s.photoUrl && (
                  <img src={s.photoUrl} alt={s.birdName} style={{
                    marginTop: 8, width: "100%", maxHeight: 180, objectFit: "cover",
                    borderRadius: 10, border: `1px solid ${T.border}`,
                  }} />
                )}
              </div>
              <button onClick={() => onDelete(s.id)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.textMuted, opacity: .4, padding: 6,
              }}>🗑️</button>
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
    const unique = new Set(sightings.map(s => s.birdId));
    const catCounts = {}, birdCounts = {}, monthCounts = {}, observerCounts = {};
    sightings.forEach(s => {
      catCounts[s.birdCategory] = (catCounts[s.birdCategory] || 0) + 1;
      birdCounts[s.birdName] = (birdCounts[s.birdName] || 0) + 1;
      monthCounts[new Date(s.date).getMonth()] = (monthCounts[new Date(s.date).getMonth()] || 0) + 1;
      if (s.observer) observerCounts[s.observer] = (observerCounts[s.observer] || 0) + 1;
    });
    return {
      total: sightings.length, unique: unique.size,
      pct: totalBirds > 0 ? Math.round(unique.size / totalBirds * 100) : 0,
      locs: new Set(sightings.map(s => s.location).filter(Boolean)).size,
      topBirds: Object.entries(birdCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => ({ name: n.length > 14 ? n.slice(0, 14) + "…" : n, count: c })),
      catData: Object.entries(catCounts).map(([k, v]) => ({ name: CATEGORIES[k]?.name || k, value: v, color: CATEGORIES[k]?.color || "#999" })),
      monthData: Array.from({ length: 12 }, (_, i) => ({ name: monthName(i), count: monthCounts[i] || 0 })),
      topObs: Object.entries(observerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => ({ name: n, count: c })),
    };
  }, [sightings, totalBirds]);

  if (!sightings.length) return (
    <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
      <h2 style={{ fontFamily: ff, fontSize: 22, color: T.text, marginBottom: 8 }}>Zatím žádná data</h2>
      <p style={{ fontFamily: fs, color: T.textMuted }}>Přidejte pozorování a statistiky se zobrazí.</p>
    </div>
  );

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: ff, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 16 }}>Statistiky</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat icon="🐦" value={stats.unique} sub={`z ${totalBirds} (${stats.pct} %)`} color={T.green} />
        <Stat icon="👁️" value={stats.total} sub="celkem" color={T.amber} />
        <Stat icon="📍" value={stats.locs} sub="míst" color={T.brownMid} />
      </div>
      <div className="stats-grid">
        <div style={{ background: T.card, borderRadius: 16, padding: "18px 14px", border: `1px solid ${T.border}` }}>
          <h3 style={{ fontFamily: ff, fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.text }}>Nejčastější druhy</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.topBirds} layout="vertical" margin={{ left: 0, right: 8 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontFamily: fs, fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily: fs, fontSize: 10 }} />
              <Tooltip contentStyle={{ fontFamily: fs, borderRadius: 8 }} />
              <Bar dataKey="count" fill={T.green} radius={[0, 5, 5, 0]} name="Počet" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: "18px 14px", border: `1px solid ${T.border}` }}>
          <h3 style={{ fontFamily: ff, fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.text }}>Podle kategorií</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.catData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={70} innerRadius={36} paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                style={{ fontFamily: fs, fontSize: 10 }}>
                {stats.catData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: fs, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: T.card, borderRadius: 16, padding: "18px 14px", border: `1px solid ${T.border}`, gridColumn: "1/-1" }}>
          <h3 style={{ fontFamily: ff, fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.text }}>Během roku</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{ fontFamily: fs, fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontFamily: fs, fontSize: 10 }} />
              <Tooltip contentStyle={{ fontFamily: fs, borderRadius: 8 }} />
              <Bar dataKey="count" fill={T.amber} radius={[4, 4, 0, 0]} name="Pozorování" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {stats.topObs.length > 1 && (
          <div style={{ background: T.card, borderRadius: 16, padding: "18px 14px", border: `1px solid ${T.border}` }}>
            <h3 style={{ fontFamily: ff, fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.text }}>Pozorovatelé</h3>
            {stats.topObs.map((o, i) => (
              <div key={o.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 0", borderBottom: i < stats.topObs.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <span style={{ fontFamily: fs, fontSize: 14, color: T.text }}>{["🥇", "🥈", "🥉"][i] || "  "} {o.name}</span>
                <span style={{ fontFamily: ff, fontSize: 18, fontWeight: 700, color: T.green }}>{o.count}</span>
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
  { id: "atlas",      label: "Atlas",      icon: "📖" },
  { id: "add",        label: "Přidat",     icon: "➕" },
  { id: "sightings",  label: "Záznamy",    icon: "📋" },
  { id: "map",        label: "Mapa",       icon: "🗺️" },
  { id: "stats",      label: "Statistiky", icon: "📊" },
];

export default function App() {
  const [page, setPage] = useState("atlas");
  const [sightings, setSightings] = useState([]);
  const [birds, setBirds] = useState([]);
  const [preselected, setPreselected] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: birdsData }, { data: sightingsData }] = await Promise.all([
        supabase.from("birds").select("*").order("name_cs"),
        supabase.from("sightings").select("*").order("date", { ascending: false }),
      ]);
      if (birdsData) setBirds(birdsData.map(mapBird));
      if (sightingsData) setSightings(sightingsData.map(mapSighting));
      setLoading(false);
    };
    load();
  }, []);

  // Save sighting to Supabase
  const save = useCallback(async (s) => {
    const { data, error } = await supabase.from("sightings").insert([s]).select().single();
    if (error) { setToast("❌ Chyba při ukládání!"); return; }
    setSightings(prev => [mapSighting(data), ...prev]);
    setPreselected(null); setPage("sightings");
    setToast(`✅ ${s.bird_name} uložen!`);
  }, []);

  // Delete sighting from Supabase
  const del = useCallback(async (id) => {
    const { error } = await supabase.from("sightings").delete().eq("id", id);
    if (error) { setToast("❌ Chyba při mazání!"); return; }
    setSightings(prev => prev.filter(s => s.id !== id));
    setToast("🗑️ Záznam smazán");
  }, []);

  // Add custom bird to Supabase
  const addBird = useCallback(async (b) => {
    const { data, error } = await supabase.from("birds").insert([{
      name_cs: b.name, category: b.category, name_latin: b.latin || null, is_custom: true,
    }]).select().single();
    if (error) { setToast("❌ Chyba při přidávání ptáka!"); return null; }
    const mapped = mapBird(data);
    setBirds(prev => [...prev, mapped].sort((a, b) => a.name.localeCompare(b.name, "cs")));
    setToast(`🐦 ${b.name} přidán do atlasu!`);
    return mapped;
  }, []);

  const goAdd = useCallback((bird) => { setPreselected(bird || null); setPage("add"); }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{CSS}</style>
      <span style={{ fontSize: 48 }}>🪶</span>
      <div style={{ fontFamily: ff, fontSize: 20, color: T.text }}>Načítám Ptačí deník…</div>
      <span style={{ fontSize: 24, display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: T.bg }}>
      <style>{CSS}</style>

      <header style={{
        background: `linear-gradient(145deg,${T.dark},${T.darkMid})`,
        padding: "14px 16px 0", position: "sticky", top: 0, zIndex: 40,
        boxShadow: "0 2px 16px rgba(0,0,0,.18)",
      }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>🪶</span>
            <h1 style={{ fontFamily: ff, fontSize: 22, fontWeight: 700, color: T.cream, letterSpacing: "-.3px" }}>Ptačí deník</h1>
            <span style={{
              fontFamily: fs, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.45)",
              background: "rgba(255,255,255,.1)", padding: "2px 10px", borderRadius: 10,
            }}>{birds.length} druhů</span>
          </div>
          <nav className="top-nav">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setPage(t.id); setPreselected(null) }} style={{
                background: page === t.id ? T.bg : "transparent",
                color: page === t.id ? T.green : "rgba(255,255,255,.55)",
              }}>{t.icon} {t.label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-content" style={{ maxWidth: 920, margin: "0 auto", padding: "18px 14px 24px" }}>
        {page === "atlas" && <AtlasPage birds={birds} sightings={sightings} onAddSighting={goAdd} onAddBird={addBird} />}
        {page === "add" && <AddPage birds={birds} preselected={preselected} onSave={save} onCancel={() => setPage("atlas")} onAddBird={addBird} />}
        {page === "sightings" && <ListPage sightings={sightings} onDelete={del} />}
        {page === "map" && <SightingsMap sightings={sightings} />}
        {page === "stats" && <StatsPage sightings={sightings} totalBirds={birds.length} />}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setPage(t.id); setPreselected(null) }}
            className={page === t.id ? "active" : ""}>
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
