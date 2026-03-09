# 🪶 Ptačí deník

Rodinná aplikace pro sledování pozorování ptáků v přírodě.

## Funkce

- **📖 Atlas** – 96 přednastavených českých ptáků + možnost přidávat vlastní druhy
- **📚 AI Atlas** – kliknutím na ptáka zobrazíte informace z AI (latinský název, vzhled, chování, hlas…)
- **➕ Nový záznam** – autocomplete výběr ptáka, datum, místo, GPS (automaticky z telefonu nebo kliknutím na mapu)
- **📋 Záznamy** – filtrování, řazení, vyhledávání, export do CSV
- **🗺️ Mapa** – interaktivní Leaflet mapa se všemi pozorováními
- **📊 Statistiky** – grafy, žebříček pozorovatelů, přehled po měsících

## Nasazení na Vercel

### 1. Push do GitHubu

```bash
git init
git add .
git commit -m "Ptačí deník v1"
git remote add origin https://github.com/VAS-USERNAME/ptaci-denik.git
git push -u origin main
```

### 2. Propojte s Vercel

1. Jděte na [vercel.com](https://vercel.com) → Import Project → vyberte repo `ptaci-denik`
2. Framework: **Vite**
3. Deploy ✅

### 3. Nastavte ANTHROPIC_API_KEY (pro AI atlas)

V Vercel Dashboard → Settings → Environment Variables:

```
ANTHROPIC_API_KEY = sk-ant-...váš-klíč...
```

Bez tohoto klíče bude vše fungovat, jen tlačítko "Zobrazit info z AI atlasu" nebude aktivní.

## Lokální vývoj

```bash
npm install
npm run dev
```

## Technologie

- React 18 + Vite
- Recharts (grafy)
- Leaflet (mapy)
- Vercel Serverless Functions (AI atlas)
- localStorage (ukládání dat)

## Sdílení dat mezi rodinou

Aktuálně data ukládá localStorage (každý prohlížeč zvlášť). Pro sdílení napříč rodinou lze napojit na **Supabase** – dejte vědět a připravím databázovou verzi!
