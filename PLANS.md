# Mājo App — Izmaiņu ieviešanas plāns

> Šis dokuments satur visas izmaiņas, kas tika veiktas 2025-02-15 sesijā.
> Plāns ir sadalīts 7 fāzēs ar pakāpenisku ieviešanu.
> Katra fāze ir neatkarīga (izņemot Fāzi 2, kas atkarīga no Fāzes 1).

---

## ⚠️ SVARĪGA ATGĀDINĀJUMS — GIT SAGLABĀŠANA

**PĒC KATRAS PABEIGTAS FĀZES obligāti veikt git commit!**

```bash
git add -A
git commit -m "Fāze X: [apraksts]"
```

**Ieteicamie commit ziņojumi:**
- `Fāze 1: Tailwind CSS migrācija no CDN uz build-time`
- `Fāze 2: Layout scroll fix (min-h-screen → h-screen)`
- `Fāze 3: Locale cache-busting`
- `Fāze 4: HomeView StatCard redesign ar statiskām krāsām`
- `Fāze 5: Admin paneļa vizuālā pārveidošana`
- `Fāze 6: Profila vizuālie uzlabojumi`
- `Fāze 7: Final build un deploy verifikācija`

**Kāpēc tas ir svarīgi:**
- Ja kaut kas sabojājas, var atgriezties uz jebkuru iepriekšējo fāzi ar `git checkout`
- Nekad vairs nezaudēsim veiktās izmaiņas
- Var salīdzināt katras fāzes izmaiņas ar `git diff`

---

## FĀZE 1: Tailwind CSS migrācija no CDN uz build-time (KRITISKA)

**Problēma:** `index.html` satur `<script src="https://cdn.tailwindcss.com"></script>` — tas ir ~15MB runtime CSS kompilators, kas nav paredzēts produkcijai. Android ierīcē tas bloķē renderēšanu un izraisa "App isn't responding" (ANR) kļūdu.

**Risinājums:** Instalēt Tailwind kā Vite spraudni, kas kompilē CSS build laikā (~48KB rezultāts).

### Solis 1.1 — Instalēt npm pakotnes
```bash
npm install tailwindcss @tailwindcss/vite
```

### Solis 1.2 — Atjaunināt vite.config.ts
Pievienot `@tailwindcss/vite` spraudni PIRMS react spraudņa:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

### Solis 1.3 — Atjaunināt src/App.css
Pievienot `@import "tailwindcss"` pašā faila sākumā (pirmā rinda):
```css
@import "tailwindcss";

html, body {
  overflow: hidden;
  height: 100%;
  margin: 0;
  padding: 0;
}
/* ... pārējais App.css paliek nemainīgs ... */
```

### Solis 1.4 — Atjaunināt src/index.tsx
Pievienot `import './App.css';` pirms App importa:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';          // <-- JAUNS
import App from './App';
// ... pārējais nemainīgs ...
```

### Solis 1.5 — Noņemt CDN skriptu no index.html
Izdzēst šo rindu:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### Solis 1.6 — Pārbaudīt
- [ ] `npm run build` izdodas bez kļūdām
- [ ] Build izvade satur CSS failu (~48KB, ne ~15MB)
- [ ] Web dev serveris (`npm run dev`) rāda pareizu izskatu

---

## FĀZE 2: Layout ritināšanas labojums

**Problēma:** Pēc Tailwind migrācijas `min-h-screen` uz Layout konteinera ļauj tam augt ārpus viewport robežām. Rezultātā `overflow-y-scroll` uz `<main>` elementa nedarbojas, jo vecākelements nav ierobežots.

**Atkarība:** Fāze 1 jābūt pabeigtai.

### Solis 2.1 — Layout.tsx: mainīt min-h-screen → h-screen
Failā `src/components/Layout.tsx`, atrast:
```tsx
<div className="flex flex-col min-h-screen bg-white max-w-md mx-auto relative shadow-2xl border-x border-gray-50">
```
Aizstāt ar:
```tsx
<div className="flex flex-col h-screen bg-white max-w-md mx-auto relative shadow-2xl border-x border-gray-50">
```

### Solis 2.2 — Pārbaudīt
- [ ] Lapas saturs ritinās pareizi
- [ ] Header un bottom nav paliek fiksēti, nemainās
- [ ] Garš saturs (piem., HomeView vai MaintenanceView) ritinās brīvi

---

## FĀZE 3: Lokalizācijas kešatmiņas labojums

**Problēma:** Bez cache-busting parametra, pārlūks vai Capacitor WebView var servēt vecos locale JSON failus no kešatmiņas pat pēc to atjaunināšanas.

### Solis 3.1 — LanguageContext.tsx: pievienot cache-busting
Failā `src/store/LanguageContext.tsx`, atrast:
```tsx
const lvResponse = await fetch('/locales/lv.json');
const ruResponse = await fetch('/locales/ru.json');
```
Aizstāt ar:
```tsx
const lvResponse = await fetch(`/locales/lv.json?v=${Date.now()}`);
const ruResponse = await fetch(`/locales/ru.json?v=${Date.now()}`);
```

### Solis 3.2 — Pārbaudīt
- [ ] Pēc locale failu izmaiņām, jaunais saturs parādās bez manuālas kešatmiņas tīrīšanas

---

## FĀZE 4: HomeView StatCard pārveidošana

**Problēma:** Dinamiskās Tailwind klases (`bg-${color}-50`, `text-${color}-600`) tiek noņemtas build laikā, jo Tailwind neatpazīst interpolētas klases. Rezultātā StatCard ir bez krāsām (balti). Turklāt dizains ir novecojis — saturs līdzināts kreisajā pusē, ikonas par mazu.

**Risinājums:** Statiska krāsu karte ar pilnām klašu nosaukumiem + centrēts dizains ar lielākām ikonām.

### Solis 4.1 — Pievienot STAT_COLORS konstantu
Pirms `HomeView` komponenta definīcijas (apmēram 78. rindā), pievienot:
```tsx
const STAT_COLORS: Record<string, { bg: string; iconBg: string; iconText: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   ring: 'ring-blue-200' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', ring: 'ring-purple-200' },
  green:  { bg: 'bg-green-50',  iconBg: 'bg-green-100',  iconText: 'text-green-600',  ring: 'ring-green-200' },
  indigo: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', ring: 'ring-indigo-200' },
};
```

### Solis 4.2 — Pārveidot StatCard komponentu
Aizstāt veco StatCard (faila beigās, ~294. rinda) ar:
```tsx
const StatCard: React.FC<{
  icon: string; value: number; label: string; color: string;
  onClick: () => void; hasUpdate?: boolean
}> = ({ icon, value, label, color, onClick, hasUpdate }) => {
  const colors = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <button onClick={onClick} className={`${colors.bg} p-4 rounded-2xl border border-gray-100/50 flex flex-col items-center justify-center min-h-[130px] active:scale-95 transition-all relative group shadow-sm`}>
      {hasUpdate && (
        <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
      )}
      <div className={`${colors.iconBg} w-12 h-12 rounded-2xl ${colors.iconText} mb-3 flex items-center justify-center group-active:scale-110 transition-transform ring-2 ${colors.ring}`}>
        <i className={`fa-solid ${icon} text-xl`}></i>
      </div>
      <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
      <span className="text-[10px] text-gray-500 font-semibold uppercase mt-1.5 tracking-tight text-center">{label}</span>
      <div className={`absolute -bottom-1 -right-1 w-8 h-8 ${colors.iconBg} rounded-full opacity-30`}></div>
    </button>
  );
};
```

**Galvenās atšķirības no vecā:**
- `items-start` → `items-center justify-center` (centrēts)
- `w-10 h-10` → `w-12 h-12` (lielāki ikonu konteineri)
- Pievienots `min-h-[130px]` (vienāds augstums)
- Pievienots dekoratīvs aplis (`absolute -bottom-1 -right-1`)
- Ikonu izmērs: noklusējuma → `text-xl`
- Statiskas klases no `STAT_COLORS` kartes

### Solis 4.3 — Pārbaudīt
- [ ] 4 karšu krāsas redzamas: zila, violeta, zaļa, indigo
- [ ] Ikonas centrētas ar 12x12 izmēru
- [ ] Visu karšu augstums vienāds (130px min)
- [ ] Darbojas gan dev, gan build režīmā

---

## FĀZE 5: Admin paneļa pārveidošana

**Apraksts:** Admin panelis pašlaik izmanto vienkāršu `isAdminPanelOpen` boolean, kas pārslēdz visu skatu. Tas ir funkcionāls, bet vajag uzlabot:
1. Admin virsraksta stils jāsakrīt ar "Tehniskie jautājumi" stilu
2. Admin pogu (AdminAction) dizains jāpielīdzina StatCard dizainam
3. Katrai admin pogai — unikāla krāsa

### Solis 5.1 — Admin virsraksta stils
Failā `src/views/ProfileView.tsx`, atrast:
```tsx
<h2 className="text-2xl font-bold">{t('admin.title')}</h2>
```
Aizstāt ar:
```tsx
<h2 className="text-2xl font-light text-gray-900">{t('admin.title')}</h2>
```

### Solis 5.2 — ADMIN_TILE_COLORS krāsu karte
Pievienot pirms ProfileView komponenta:
```tsx
const ADMIN_TILE_COLORS: Record<string, { bg: string; iconBg: string; iconText: string; border: string }> = {
  orange:  { bg: 'bg-orange-500',  iconBg: 'bg-orange-400',  iconText: 'text-white', border: 'border-orange-600' },
  blue:    { bg: 'bg-blue-500',    iconBg: 'bg-blue-400',    iconText: 'text-white', border: 'border-blue-600' },
  purple:  { bg: 'bg-purple-500',  iconBg: 'bg-purple-400',  iconText: 'text-white', border: 'border-purple-600' },
  emerald: { bg: 'bg-emerald-500', iconBg: 'bg-emerald-400', iconText: 'text-white', border: 'border-emerald-600' },
  red:     { bg: 'bg-red-500',     iconBg: 'bg-red-400',     iconText: 'text-white', border: 'border-red-600' },
  slate:   { bg: 'bg-slate-600',   iconBg: 'bg-slate-500',   iconText: 'text-white', border: 'border-slate-700' },
  teal:    { bg: 'bg-teal-500',    iconBg: 'bg-teal-400',    iconText: 'text-white', border: 'border-teal-600' },
};
```

### Solis 5.3 — AdminAction komponenta pārveidošana
Aizstāt veco AdminAction (faila beigās) ar:
```tsx
const AdminAction: React.FC<{
  icon: string; label: string; onClick: () => void;
  active: boolean; badge?: number; color?: string
}> = ({ icon, label, onClick, active, badge, color = 'blue' }) => {
  const tileColor = ADMIN_TILE_COLORS[color] || ADMIN_TILE_COLORS.blue;
  return (
    <button onClick={onClick} className={`${tileColor.bg} p-4 rounded-2xl flex flex-col items-center justify-center min-h-[130px] active:scale-95 transition-all relative text-white shadow-md`}>
      {badge && badge > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{badge}</span>
      )}
      <div className={`${tileColor.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-3 border-2 border-white/30`}>
        <i className={`fa-solid ${icon} text-xl`}></i>
      </div>
      <span className="text-[10px] font-bold uppercase text-center tracking-tight">{label}</span>
    </button>
  );
};
```

### Solis 5.4 — Admin grid ar krāsām
Atjaunināt admin grid izsaukumus, pievienojot `color` prop:
```tsx
<div className="grid grid-cols-2 gap-3">
  <AdminAction icon="fa-user-clock"           label={t('admin.pending_users')} onClick={...} active={...} badge={...} color="orange" />
  <AdminAction icon="fa-bullhorn"             label={t('admin.announce')}      onClick={...} active={...} color="blue" />
  <AdminAction icon="fa-calendar-plus"        label={t('admin.meeting')}       onClick={...} active={...} color="purple" />
  <AdminAction icon="fa-check-to-slot"        label={t('admin.vote')}          onClick={...} active={...} color="emerald" />
  <AdminAction icon="fa-triangle-exclamation" label={t('admin.emergency')}     onClick={...} active={...} color="red" />
  <AdminAction icon="fa-user-shield"          label="PĀRVALDNIEKS"            onClick={...} active={...} color="slate" />
</div>
```

### Solis 5.5 — Pārbaudīt
- [ ] Admin virsraksts ar vieglu fontu (font-light)
- [ ] Katrai admin pogai unikāla krāsa
- [ ] Pogu izmērs sakrīt ar HomeView StatCard (130px min augstums, 12x12 ikonas)
- [ ] Badge (pending lietotāju skaits) redzams uz oranžās pogas

---

## FĀZE 6: Profila sadaļas vizuālie uzlabojumi

**Apraksts:** Profila poga uz admin paneli un citas profila pogas jāuzlabo vizuāli.

### Solis 6.1 — Admin paneļa pogas krāsa
Admin paneļa poga pašlaik ir `bg-indigo-600`. Mainīt uz zīmola krāsu:
```tsx
// BIJ:
<button onClick={() => setIsAdminPanelOpen(true)} className="w-full bg-indigo-600 text-white p-4 rounded-2xl ...">
// JĀBŪT:
<button onClick={() => setIsAdminPanelOpen(true)} className="w-full text-white p-4 rounded-2xl ..." style={{ backgroundColor: '#5B9BD5' }}>
```

### Solis 6.2 — Profila ikonu krāsas
E-pasta un paroles pogu ikonām pievienot zīmola krāsu fonā:
- E-pasta ikona: no `text-gray-400` uz krāsainu ikonu ar fonu
- Paroles ikona: līdzīgi

### Solis 6.3 — Pārbaudīt
- [ ] Profila pogas izskatās saskaņotas
- [ ] Admin paneļa poga ir zīmola zilā krāsā (#5B9BD5)

---

## FĀZE 7: Build, izvietošana un testēšana

### Solis 7.1 — Web pārbaudīšana
```bash
npm run dev
```
Pārbaudīt pārlūkā: http://localhost:5173
- [ ] Visi stili ielādējas pareizi
- [ ] Nav Console kļūdu
- [ ] Ritināšana darbojas
- [ ] StatCard krāsas redzamas
- [ ] Admin panelis atveras un darbojas
- [ ] Valodas pārslēgšana darbojas

### Solis 7.2 — Android build
```bash
npm run build
npx cap sync android
```

### Solis 7.3 — Android emulators
```bash
# Startēt emulatoru (ja nav startēts)
C:\Users\HomeComputer\AppData\Local\Android\Sdk\emulator\emulator.exe -avd Pixel_7_test -wipe-data

# Gaidīt līdz emulators ir gatavs, tad:
cd android
.\gradlew.bat assembleDebug

# Instalēt APK
C:\Users\HomeComputer\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r app\build\outputs\apk\debug\app-debug.apk

# Palaist
C:\Users\HomeComputer\AppData\Local\Android\Sdk\platform-tools\adb.exe shell am start -n "lv.majo.app/.MainActivity"
```

### Solis 7.4 — Android testēšana
- [ ] App ielādējas ātri (nav ANR)
- [ ] Stili redzami pareizi
- [ ] Ritināšana darbojas
- [ ] Nav "App isn't responding" dialoga

---

## ATZĪMĒTAS PROBLĒMAS (nenovērstas — apsvērt nākotnē)

Supabase audita rezultāti no šodienas sesijas. Šīs problēmas NETIKA labotas:

1. **`addManager` atlogo admin:** Supabase `signUp()` automātiski atlogo pašreizējo lietotāju reistē. Risinājums: izmantot admin API (`supabase.auth.admin`) vai izveidot atsevišķu Supabase instanci.

2. **`updateUser` / `deleteUser` nenoturās:** Izmaiņas tiek veiktas tikai lokālajā state, bet netiek saglabātas Supabase datubāzē. Risinājums: izsaukt Supabase `update`/`delete` funkcijas.

3. **Paziņojumu arhivēšana ir pagaidu:** Arhivēti paziņojumi pazūd pēc lapas pārlādēšanas. Risinājums: saglabāt arhīva statusu Supabase datubāzē.

4. **`activity_logs` tabula trūkst `user_id` kolonna:** Datubāzes shēmā nav `user_id`. Risinājums: pievienot kolonnu Supabase migrācijā.

5. **Chat `last_message_at` netiek atjaunināts:** Tēmas timestamp nemainās pēc jaunas ziņas nosūtīšanas. Risinājums: atjaunināt chat_topics tabulu pēc katras ziņas.

6. **Logo faila izmērs:** `app2_logo.png` ir ~5.6MB — ļoti liels. Vajadzētu kompresēt līdz <500KB ar TinyPNG vai konvertēt uz WebP.

---

## IMPLEMENTĒŠANAS SECĪBA

```
Fāze 1 (Tailwind migrācija)    ← OBLIGĀTI PIRMS visa cita
  ↓
Fāze 2 (Layout scroll fix)     ← Atkarīga no Fāzes 1
  ↓
Fāze 3 (Locale cache-busting)  ← Neatkarīga, var jebkurā secībā
Fāze 4 (StatCard redesign)     ← Neatkarīga, var jebkurā secībā
Fāze 5 (Admin panelis)         ← Neatkarīga, var jebkurā secībā
Fāze 6 (Profila vizuālie)      ← Neatkarīga, var jebkurā secībā
  ↓
Fāze 7 (Build & Deploy)        ← VIENMĒR PĒDĒJĀ
```

Ieteicamā secība: 1 → 2 → 3 → 4 → 5 → 6 → 7
