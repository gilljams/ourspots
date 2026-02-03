# OurSpots

En mobilfokuserad app för att hantera fastigheter, smultronställen, kaféer, resor och andra platser med delningsfunktioner.

🌐 **Live:** [https://ourspots.se](https://ourspots.se)

> 📦 Backup: [https://ourspots-b536b.web.app](https://ourspots-b536b.web.app) (Firebase)

## 🎯 Vision

OurSpots är en platsbaserad app med premium dark theme som låter användare:
- Skapa och organisera objekt (fastigheter, kaféer, naturplatser, etc.)
- Bygga objekt med modulära block (bilder, platser, text, checklistor)
- Dela objekt med andra (viewer/editor-roller)
- Organisera i lager och kategorier
- Se objekt på karta med avstånd och navigation
- Publik vy för externa användare

## 🏗️ Nuvarande Status (v1.4 - Navigation & UX-förbättringar)

### ✅ Implementerat

#### Kärnfunktioner
- **Dark theme med glassmorphism** - Premium design med radial glows
- **Modulär block-arkitektur** - title, image, location (flera per objekt), text, checklist, todo
- **Firebase Firestore** - Real-time databas med persistent lagring
- **Firebase Authentication** - Google-inloggning med rollhantering
- **Security Rules** - Bara ägare kan redigera sina objekt, admin har full åtkomst
- **CRUD-funktionalitet** - Create, Read, Update, Delete
- **Responsive design** - Mobiloptimerad, testad på iOS/Android
- **GitHub Pages** - Live deployment med optimerad bundle

#### Block & Innehåll
- **Checklist block** - Kryssrutor med state-synk i modal och nollställningsfunktion
- **Todo block** - Uppgiftslista med progress-bar och nollställningsfunktion
- **Reset-knappar** - Nollställ alla markeringar i Todo/Checklist för återkommande uppgifter
- **Dynamiska block med titlar** - Flera text/checklist/todo med egna titlar
- **Expand/Collapse-block** - Kollapsade som standard (första öppen), thumbnail-bild, kompakt plats
- **Drag & drop blockordning** - Dra för att sortera; upp/ner-pilar för mobil
- **Optimistic updates** - Omedelbar UI-feedback för checklist/todo
- **Race condition-säkerhet** - Functional setState för robusta uppdateringar

#### Bildhantering
- **Smart bilduppladdning** - Cloudinary med AI-beskärning, automatisk komprimering och GPS-extrahering
- **Cloudinary smart cropping** - AI-baserad beskärning (Auto, Ansikten, Centrum)
- **Automatisk bildkomprimering** - Max 2000px, 85% kvalitet före uppladdning
- **GPS från bilder** - Automatisk plats-extrahering från EXIF-data

#### Kategorier & Navigation
- **Dynamiska kategorier** - Firebase-baserad kategorihantering med 24 ikoner från Lucide React
- **Optimerad icon-import** - Tree-shaking för 575 kB mindre bundle (19 kB vs 594 kB)
- **Kategori-navigation** - Swipe-bar för filtrering, reordnad layout (Favoriter → Alla → Kategorier)
- **Ikoner från Lucide React** - 24 välbara ikoner inklusive mat, nöjen, aktiviteter, natur

#### Karta & Position
- **Kartintegration** - Leaflet + react-leaflet med CARTO voyager tiles (helt gratis)
- **Fullscreen kartvy** - Floating toggle-knapp för att växla mellan list- och kartvy
- **Auto-scroll till toppen** - Kartan visas alltid korrekt utan vit yta (automatisk scroll vid växling)
- **Dynamisk kartcentrering** - "Visa på karta" centrerar faktiskt på rätt position med zoom 14
- **Markörtooltips** - Desktop: hover-tooltip, Mobile: tap popup med "Visa detaljer"-knapp
- **GPS-positionering** - Fångar användares aktuella position automatiskt vid app-start
- **Interaktiv kartplockning** - Modal för att välja plats genom att klicka på kartan
- **Egen position på karta** - Blå användarikon på huvudkarta och kartväljare
- **Avstånd från användare** - Visa km-avstånd till varje objekt (Haversine-formel)
- **Avståndssorterad lista** - Toggle-knapp för att sortera objekt från närmast till längst bort
- **Marker clustering** - Stora, tydliga kluster som skalar med antal
- **Markörfärger per kategori** - Dynamiska färger baserat på kategoriinställningar

#### Navigation & Vägbeskrivning
- **Klickbar location på kort** - Platsinformation är klickbar direkt på objektkort (ingen modal behövs)
- **Navigation-meny från kort** - Klicka på platstext för att öppna navigation-alternativ
- **Navigation-meny i objekt** - Samma meny på varje location-block i detaljvyn
- **Tre navigation-alternativ:**
  - **Visa på karta** - Stänger modal, byter till kartvy, centrerar på position
  - **Google Maps** - Öppnar Google Maps med vägbeskrivning i ny flik
  - **Waze** - Öppnar Waze-app med navigation i ny flik
- **Subtil hover-effekt** - Location-text blir blå vid hover, indikerar klickbarhet
- **Meny döljs utanför klick** - Click-outside detection för smidig UX
- **Kartknapp döljs vid modal** - Ingen visuell kollision mellan kartknapp och öppen modal

#### Offline & Quick Capture (🍄 Svampknapp)
- **Quick GPS Capture** - Orange flytande knapp med Target-ikon för snabb positionslagring
- **Offline-plockning** - Spara GPS-positioner i skogen utan uppkoppling (localStorage)
- **Direkt till objekt** - Välj objekt att lägga till positioner direkt på (snabbare än via lista)
- **Flera location-blocks** - Varje objekt kan ha många GPS-positioner (Pin 1, Pin 2, etc.)
- **Pin-numrering** - Tydlig numrering i detaljvy och på karta för att matcha positioner
- **Capture-lista** - Modal med alla sparade pinningar inkl. tidsstämplar och koordinater
- **Radera captures** - Ta bort enskilda pinningar från listan
- **Radera location-blocks** - Ta bort enskilda positioner från objekt
- **Kartvisualisering** - Alla location-blocks visas som separata markörer på kartan
- **Automatisk clustering** - Markörer grupperas på zoom-out, separeras på zoom-in
- **Badge-indikatorer** - Visar antal sparade captures på både knapp och meny
- **Villkorlig synlighet** - "Visa pinningar" visas bara när svampknappen är aktiverad
- **Animerad svampknapp** - Glider mjukt ner när modal öppnas (fyller mellanrum när kartknappen döljs)
- **Perfekt för svampplockning** - Markera flera kantarellställen på samma objekt

#### Hierarki & Organisation
- **Hierarki (Parent-Child)** - Organisera objekt som förälder-barn, dela plats mellan nivåer
- **Location inheritance** - Barn kan ärva förälderns position om de inte har egen
- **Breadcrumb-navigering** - Visa hierarki: Alla > Förälder > Barn
- **Child-count badges** - Visa antal barn på parent-kort
- **Förbättrad parent-navigering** - SVG-ikon och tydlig placering för tillbaka-knapp
- **Smart parent-dropdown** - Grupperad per kategori med alfabetisk sortering
- **Hierarkisk visualisering** - Top-objekt först, sedan barn med └─ Symbol (under ParentName)

#### Sök & Filter
- **Sök & filter** - Sök på objektnamn/innehåll, filtrera på kategori och avstånd (km-slider)
- **Favoriter** - Toggle-filter som kombineras med kategorier, persistent i Firebase
- **Kombinerad filtrering** - Favoriter + kategori samtidigt (t.ex. favorit Mat & Dryck)

#### UI/UX
- **Kort-baserad listvy** - Med bilder och platsinformation
- **Detaljvy** - Modal med komplett objektinformation och collapsed hantera-sektion
- **Collapsed hantering** - Redigera/Ta bort döljs i expanderbar "Hantera objekt"-sektion
- **Förbättrade block-knappar** - Tydlig separering och ikoner för "Lägg till block"
- **Stäng detaljmodal via overlay** - Klick utanför modalen för att stänga
- **Kartknapp döljs vid modal** - Ingen visuell kollision mellan knappar och öppen modal
- **Ägarskap** - Objekt märks med "Ditt" för inloggad användare
- **Förbättrad favoritknapp** - Större träffyta och fixad undefined-bug för stabil favorithantering
- **Omstrukturerad burgermeny** - Inställningar först, Snabbpinningar sist med villkorlig visning

#### Admin-funktioner
- **Admin-sektion** - Kategorihantering och objekthantering för administratörer
- **Kategorihantering** - Skapa, redigera, radera, ordna kategorier med ikoner och färger
- **Objektadministration** - "Alla objekt"-vy för att hantera objekt i stor skala
  - **Användarfiltrering** - Välj specifik användare eller "Alla användare" (inget default för prestanda)
  - **Sökfunktion** - Filtrera objekt på titel
  - **Sortering** - Sortera på titel, kategori eller parent-relation
  - **Problemdetektion:**
    - Varning för objekt med ogiltiga kategorier
    - Detektion av cirkulära parent-referenser (objekt som pekar på sig själv)
    - Detektion av icke-existerande parents
  - **Snabbåtgärd** - "Ta bort parent"-knapp för att fixa cirkulära/ogiltiga referenser
  - **Direkt redigering** - Klicka "Redigera" för att öppna edit-modal direkt
- **Förebyggande åtgärder** - Objektet och dess children kan inte väljas som parent (förhindrar cirkelreferenser)
- **Admin kan redigera alla objekt** - Inklusive ägarlösa och andra användares objekt

#### Optimeringar & Prestanda
- **Skärmhantering** - "Håll skärmen påslagen" med Wake Lock API + auto-retry vid release
- **Optimerad bundle** - Tree-shaking och lazy loading för snabbare laddning
- **Race condition-säkerhet** - Functional setState för robusta uppdateringar
- **Optimistic updates** - Omedelbar UI-feedback för checklist/todo

### 🚧 Kommande Features (Prioriterad backlog)
1. **PWA** - Installera som app, offline-support, service worker
2. **Fler blocktyper** - Betyg, öppettider, kontaktinfo, länkar
3. **Delningsfunktion** - Dela objekt med viewer/editor-roller
4. **Lager/samlingar** - Gruppera objekt för resor och projekt
5. **Publik vy** - Sharable links för externa användare
6. **Avancerad admin** - Användarhantering, statistik, backup/restore
7. **Import/Export** - Backup och migrering av data

## 🎨 Admin-funktioner

### Kategorihantering (endast för administratörer)
- **Skapa kategorier** - Namn, ikon från 24 valmöjligheter, anpassad färg
- **Redigera kategorier** - Ändra namn, ikon och färg
- **Ordna kategorier** - Flytta upp/ner för att ändra ordning i navigering
- **Radera kategorier** - Med automatisk hantering av kopplade objekt
- **Tillgängliga ikoner:**
  - Hem, Kafé, Berg, Stjärna, Plats, Kalender, Mapp, Navigation
  - Mat & dryck: UtensilsCrossed, Pizza, Vin, Öl
  - Nöjen: Gamepad, Musik, Film, Fest
  - Aktiviteter: Cykel, Träning, Vatten
  - Natur: Skog, Strand, Svamp/Planta

### Objekthantering (endast för administratörer)
- **Visa alla objekt** - Skalbar vy med användarfiltrering och sökfunktion
- **Användarfiltrering** - Välj specifik användare för att se deras objekt (tvingande val för prestanda)
- **Sökfunktion** - Sök på objekttitlar i real-time
- **Sortering** - Sortera alfabetiskt på titel, kategori eller parent-relation
- **Problemdetektion:**
  - Cirkulära references (🔁 objekt som pekar på sig själv)
  - Ogiltiga kategorier (⚠️ kategorier som inte längre finns)
  - Icke-existerande parents (⚠️ parent-ID som inte finns)
- **Snabbåtgärder:**
  - "Ta bort parent" - Fix cirkulära/ogiltiga parent-referenser med ett klick
  - "Redigera" - Öppnar edit-modal direkt från admin-vyn
- **Visuell feedback** - Gul bakgrund och varningsikon för problematiska objekt
- **Skalbarhet** - Inget default-filter för att undvika att ladda hundratals objekt direkt

### Så här blir du admin:
1. Logga in i appen med Google
2. Öppna Firebase Console → Firestore Database
3. Gå till `users` collection och hitta ditt användar-dokument
4. Sätt fältet `isAdmin` till `true` (boolean)
5. Ladda om appen - Admin-sektion visas nu i menyn

## 📦 Tech Stack

- **Frontend:** React 19.2.0 + Vite (hot reload, optimerad bundle)
- **Styling:** Tailwind CSS v3 + Glassmorphism + Radial gradients
- **Icons:** Lucide React (24 ikoner, tree-shaking optimerad)
- **Maps:** Leaflet + react-leaflet + react-leaflet-cluster (CARTO tiles, helt gratis)
- **Database:** Firebase Firestore (real-time, persistent, security rules)
- **Authentication:** Firebase Auth (Google Sign-in med rollhantering)
- **Image Storage:** Cloudinary (unsigned uploads, 25GB gratis/månad)
- **Image Processing:** 
  - Client-side resize (Canvas API, max 2000px, 85% kvalitet)
  - Cloudinary AI smart cropping (auto/face/center)
  - Custom EXIF GPS-extrahering
- **Geolocation:** Browser Geolocation API + Haversine-formel för avstånd
- **Screen Management:** Wake Lock API (håll skärmen påslagen)
- **State Management:** React useState + functional setState för race condition-säkerhet
- **Optimeringar:** Tree-shaking, lazy loading, optimistic updates
- **Hosting:** Firebase Hosting (primär) + GitHub Pages (backup)
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions för GitHub Pages, manuell deploy till Firebase

## 🚀 Kom igång

### Förutsättningar
- Node.js v20+ ([ladda ner](https://nodejs.org/))
- Git ([ladda ner](https://git-scm.com/))
- GitHub-konto
- Google-konto (för inloggning i appen)
- VS Code (rekommenderat)

### Installation

1. **Klona projektet:**
   ```bash
   git clone https://github.com/gilljams/ourspots.git
   cd ourspots
   ```

2. **Installera dependencies:**
   ```bash
   npm install
   ```

3. **Starta utvecklingsserver:**
   ```bash
   npm run dev
   ```

4. **Öppna i webbläsare:**
   ```
   http://localhost:5173
   ```

5. **Logga in med Google** för att börja skapa objekt!

### Bygg för produktion

```bash
npm run build
```

Byggda filer hamnar i `dist/`-mappen.

### 🚀 Deploya till Firebase Hosting (Primär)

Firebase Hosting är den primära deployment-metoden. Kräver Firebase CLI.

```bash
# Första gången: Installera Firebase CLI och logga in
npm install -g firebase-tools
firebase login

# Bygg och deploya
npm run build
npx firebase deploy --only hosting
```

**URL:** https://ourspots-b536b.firebaseapp.com

**Egen domän:** Firebase Console → Hosting → "Add custom domain" → DNS-verifiering → Automatisk SSL

### 📦 Deploya till GitHub Pages (Backup)

GitHub Pages triggas automatiskt via GitHub Actions vid push till main.
Kan även köras manuellt:

```bash
npm run deploy
```

**URL:** https://gilljams.github.io/ourspots/

## 📁 Projektstruktur

```
ourspots/
├── src/
│   ├── App.jsx           # Huvudkomponent med all logik
│   ├── firebase.js       # Firebase konfiguration
│   ├── main.jsx          # Entry point
│   ├── index.css         # Tailwind imports
│   └── assets/           # Bilder och media
├── public/               # Statiska filer
├── dist/                 # Byggda filer (genereras)
├── index.html            # HTML template
├── package.json          # Dependencies och scripts
├── vite.config.js        # Vite konfiguration
├── tailwind.config.js    # Tailwind konfiguration
├── postcss.config.js     # PostCSS konfiguration
├── README.md             # Denna fil
└── MANIFEST.md           # Komplett produktspecifikation
```

## 🔥 Firebase Setup

### Om du vill sätta upp eget Firebase-projekt:

1. **Skapa Firebase-projekt:**
   - Gå till [Firebase Console](https://console.firebase.google.com)
   - Skapa nytt projekt
   - **Viktigt:** Aktivera INTE Google Analytics eller Gemini (kräver billing)

2. **Aktivera Firestore:**
   - Gå till Firestore Database
   - Klicka "Create database"
   - Välj "Start in test mode"
   - Välj region: `eur3 (europe-west)`

3. **Aktivera Authentication:**
   - Gå till Authentication
   - Klicka "Get started"
   - Aktivera "Google" som sign-in method

4. **Konfigurera Security Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /objects/{objectId} {
         allow read: if true;
         allow create: if request.auth != null;
         allow update, delete: if request.auth != null && 
                                  request.auth.uid == resource.data.ownerId;
       }
     }
   }
   ```

5. **Lägg till authorized domains:**
   - Authentication → Settings → Authorized domains
   - Lägg till din GitHub Pages-domän: `username.github.io`

6. **Uppdatera `src/firebase.js`:**
   - Ersätt `firebaseConfig` med din egen från Firebase Console

## 📤 Cloudinary Setup (Image Upload)

### Gratis bilduppladdning:

1. **Skapa Cloudinary-konto:**
   - Gå till [cloudinary.com](https://cloudinary.com/users/register_free)
   - Registrera dig (gratis, inget kreditkort)

2. **Få Cloud Name:**
   - Dashboard → Product Environment Credentials
   - Kopiera **Cloud Name**

3. **Skapa Upload Preset:**
   - Settings → Upload → Upload presets
   - Add upload preset → Sät **Signing Mode: Unsigned**
   - Kopiera preset-namnet

4. **Uppdatera `src/App.jsx`:**
   ```javascript
   const CLOUDINARY_CLOUD_NAME = 'ditt-cloud-name';
   const CLOUDINARY_UPLOAD_PRESET = 'ditt-preset';
   ```

**Gratis gränser:** 25GB lagring/månad, obegränsade uploads

## 🗺️ Datamodell

### Object
```javascript
{
  id: string,                    // Auto-genererat av Firestore
  parentId?: string,             // Parent-objekt för hierarki
  layerId: string,               // Default: "default"
  type: string,                  // Kategori-ID (från categories collection)
  blocks: Block[],               // Modulära innehållsblock
  ownerId: string,               // Firebase Auth UID
  ownerName: string,             // Användarens namn
  ownerEmail: string,            // Användarens email
  createdAt: Timestamp,          // Skapad tid
  updatedAt: Timestamp           // Senast uppdaterad
}
```

### Block (Modulär struktur)
```javascript
{
  id: string,                    // Unikt ID för block
  type: "title" | "image" | "location" | "text" | "checklist" | "todo",
  title?: string,                // Valfri titel för text/checklist/todo-block
  data: {
    // title: { text: string }
    // image: { url: string, cropMode?: "auto" | "face" | "center" }
    // location: { lat: number, lng: number, address?: string }
    // text: { content: string }
    // checklist: { items: [{ text: string, checked: boolean }] }
    // todo: { items: [{ text: string, done: boolean }] }
  }
}
```

### Category (Dynamisk kategorihantering)
```javascript
{
  id: string,                    // Auto-genererat från label
  label: string,                 // Visningsnamn (ex: "Mat & Dryck")
  icon: string,                  // Lucide icon name (ex: "Coffee")
  color: string,                 // Hex-färg (ex: "#8b4513")
  order: number,                 // Sorteringsordning
  createdAt: Timestamp,          // Skapad tid
  createdBy: string              // Skapare (userId)
}
```

### User
```javascript
{
  id: string,                    // Firebase Auth UID
  email: string,                 // Email från Google Auth
  displayName: string,           // Namn från Google
  photoURL: string,              // Profilbild från Google
  isAdmin: boolean,              // Admin-behörighet
  favorites: string[],           // Array av objekt-ID:n
  createdAt: Timestamp           // När användaren skapades
}
```

### Layer (Planerat - Ej implementerat)
```javascript
{
  id: string,                    // Layer-ID
  name: string,                  // Namn (ex: "Sommarresa 2026")
  type: "default" | "trip" | "project" | "public",
  color?: string,                // Accentfärg
  icon?: string                  // Ikon
}
```

## 🎨 Design System

### Färger
- **Background:** Gray-900 med blå gradient
- **Cards:** White/5 med backdrop-blur (glassmorphism)
- **Accent:** Blue-500
- **Text:** White (titlar), Gray-300/400 (body)
- **Borders:** White/10

### Ikoner (Fördefinierade)
- 🏡 Fastighet
- 🏠 Hus
- 🚗 Garage
- 🌳 Trädgård
- 🍓 Smultronställe
- 🍄 Svamp
- ☕ Kafé/Restaurang
- ✈️ Resa
- 🏞️ Natur
- ⭐ Favorit

## 🔧 Utveckling

### Användning

**Starta dev server:**
```bash
npm run dev
```

**Bygga för produktion:**
```bash
npm run build
```

**Preview produktion-bygge:**
```bash
npm run preview
```

**Deploya till GitHub Pages:**
```bash
npm run deploy
```

### Lägga till nya block-typer

1. Skapa en ny block-komponent:
```javascript
const ChecklistBlock = ({ data }) => (
  <div className="space-y-2">
    {data.items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <input type="checkbox" checked={item.done} readOnly />
        <span>{item.text}</span>
      </div>
    ))}
  </div>
);
```

2. Lägg till i `blockComponents`:
```javascript
const blockComponents = {
  title: TitleBlock,
  image: ImageBlock,
  location: LocationBlock,
  text: TextBlock,
  checklist: ChecklistBlock // Ny!
};
```

3. Uppdatera formulär för att lägga till checklist-data

### Lägga till nya kategorier

Uppdatera `categories`-arrayen i `App.jsx`:
```javascript
const categories = [
  { id: 'all', label: 'Alla', icon: Star },
  { id: '🏡', label: 'Fastigheter', icon: Home },
  { id: '☕', label: 'Kaféer', icon: Coffee },
  { id: '🏞️', label: 'Natur', icon: Mountain },
  { id: '✈️', label: 'Resor', icon: Calendar } // Ny!
];
```

## 🐛 Felsökning

### Tailwind fungerar inte
```bash
# Rensa cache och starta om
rm -rf node_modules/.vite
npm run dev
```

### Firebase connection error
- Kontrollera att `src/firebase.js` har rätt config
- Kontrollera att Firestore är aktiverad i Firebase Console
- Kontrollera Security Rules

### Authentication error på GitHub Pages
- Lägg till din GitHub Pages-domän i Firebase → Authentication → Settings → Authorized domains

### Port 5173 upptagen
Ändra port i `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    port: 3000
  }
})
```

### Cross-Origin-Opener-Policy varning
Detta är en varning från Firebase Auth + GitHub Pages. Kan ignoreras - påverkar inte funktionalitet.

## 🔒 Säkerhet

### Aktuella Security Rules
- ✅ Alla kan läsa objekt (publik vy)
- ✅ Bara inloggade kan skapa objekt
- ✅ Bara ägare kan uppdatera/radera sina objekt

### Nästa steg för säkerhet
- [ ] Implementera roller (admin, editor, viewer)
- [ ] Rate limiting för API-anrop
- [ ] Input validation på serversidan
- [ ] Content Security Policy headers

## 📝 Changelog

### v1.3 - Admin-verktyg & Stabilitet (2026-01-26)
- ✨ **Admin: "Alla objekt"-vy** - Skalbar objekthantering med användarfilter och sök
- 🔍 **Problemdetektion** - Upptäck cirkulära parent-referenser och ogiltiga kategorier
- 🛠️ **Snabbåtgärder** - "Ta bort parent"-knapp för att fixa cirkelreferenser direkt
- 🔒 **Förebyggande** - Objektet och dess children kan inte väljas som parent i formulär
- 👥 **Användarfilter** - Visa objekt per användare med namn/email (inte bara ID)
- 🎯 **Tvingande val** - Inget default-filter för att undvika att ladda hundratals objekt
- 📍 **Flera location-blocks** - Varje objekt kan ha många GPS-positioner
- 🔢 **Pin-numrering** - Pin 1, Pin 2 etc. i både detaljvy och karta
- 🗑️ **Radera location-blocks** - Ta bort enskilda positioner från objekt
- 🗺️ **Kartvisualisering** - Alla location-blocks visas som separata markörer
- 🎯 **Direkt till objekt** - Svampknappen kan lägga till positioner direkt på valt objekt
- ⚠️ **Ogiltig kategori-varning** - Objekt med borttagna kategorier markeras tydligt
- 🔄 **Wake Lock auto-retry** - Automatisk återaktivering om iOS släpper Wake Lock
- 🐛 **Favorit-buggfix** - Fixad undefined-fel vid favoritmarkering
- 🎨 **Förbättrad burgermeny** - Omstrukturerad: Inställningar → Snabbpinningar (villkorlig)

### v1.2 - Svampknapp & Offline-plockning (2026-01-26)
- 🍄 **Quick Capture (Svampknapp)** - Orange flytande knapp för snabb GPS-lagring
- 📍 Offline GPS-plockning med localStorage (perfekt för svampplockning i skogen)
- 📋 Capture-modal med lista över alla sparade pinningar
- 🗑️ Ta bort enskilda captures
- ✨ Skapa fullständigt objekt från sparad capture
- 🔢 Badge-indikatorer som visar antal captures
- 🌲 Use case: Markera kantarellställen utan uppkoppling, skapa objekt senare

### v1.1 - UX-förbättringar & Optimeringar (2026-01-26)
- 🎯 Collapsed "Hantera objekt"-sektion för renare detaljvy
- 🗂️ Smart parent-dropdown med kategorisering och hierarkisk visualisering
- 📊 Parent-dropdown visar top-objekt först, sedan barn med └─ Symbol
- ♻️ Reset-funktionalitet för Todo/Checklist (nollställ alla markeringar)
- 🏷️ Dynamiska block-titlar för text/checklist/todo-block
- 📦 Expand/Collapse för alla block i detaljvy
- ⚡ Optimerad icon-bundle (575 kB mindre, 19 kB vs 594 kB)
- 🔒 Race condition-säkerhet med functional setState
- 🎨 Förbättrade block-knappar med tydlig separering
- 🔄 Admin kan redigera och radera alla objekt

### v1.0 - Karta, Favoriter & Admin (2026-01-25)
- 🗺️ Kartintegration med Leaflet + CARTO tiles
- 📍 GPS-positionering och avstånd från användare
- 🎯 Marker clustering med kategori-färger
- ⭐ Favoriter med kombinerad filtrering (favoriter + kategori)
- 🔍 Sök & filter (namn, innehåll, avstånd med km-slider)
- 🏗️ Hierarki (parent-child) med location inheritance
- 🗂️ Dynamiska kategorier med Firebase-hantering
- 👑 Admin-sektion för kategorihantering
- 🎨 24 Lucide React-ikoner för kategorier
- 📱 Skärmhantering med Wake Lock API
- 🎭 Drag & drop blockordning (desktop + mobil-pilar)

### v0.3 - Block & Upload MVP (2026-01-25)
- ✨ Checklist block med checkbox-toggle
- ✨ Todo block med progress-bar
- ✨ Cloudinary image upload (25GB gratis/månad)
- 🤖 Smart cropping med AI (auto/face/center)
- 📸 GPS-extrahering från EXIF-data
- 🗜️ Automatisk bildkomprimering (max 2000px)
- 🔄 Optimistic updates - omedelbar UI-feedback
- 🎨 Förbättrad kontrast i dark theme
- 📱 Responsiv kategori-bar

### v0.2 - Authentication MVP (2026-01-24)
- ✨ Firebase Authentication med Google Sign-in
- 🔒 Security Rules - bara ägare kan redigera
- 👤 Användarprofilvisning i header
- 🏷️ "Ditt" badge på egna objekt
- 🚫 Inloggning krävs för att skapa objekt

### v0.1 - Initial MVP (2026-01-24)
- ✨ Dark theme med glassmorphism
- 📦 CRUD-funktionalitet
- 🔥 Firebase Firestore integration
- 🎨 Modulär block-arkitektur
- 📱 Responsiv design
- 🌐 GitHub Pages deployment
- 📚 Komplett dokumentation

## 🎯 Roadmap

### ✅ Klart (v0.1 - v1.1)
- [x] Dark theme med glassmorphism
- [x] Modulär block-arkitektur
- [x] Firebase Authentication & Firestore
- [x] Checklist & Todo block med state-synk
- [x] Bilduppladdning (Cloudinary med AI-beskärning)
- [x] Sökning och filtrering
- [x] Favoriter/stjärnmarkering
- [x] Kartintegration (Leaflet)
- [x] Hierarki (parent/child-relationer)
- [x] Dynamiska kategorier
- [x] Admin-sektion
- [x] GPS-positionering
- [x] Avstånd och sortering
- [x] Marker clustering
- [x] Wake Lock API
- [x] Optimerad bundle

### Kort sikt (Q1 2026)
- [x] Quick Capture (Svampknapp) för offline GPS-plockning ✅ v1.2
- [ ] PWA-implementation (manifest.json, service worker)
- [ ] Installera som app
- [ ] Offline-support för hela appen
- [ ] Ratings-block (1-5 stjärnor)
- [ ] Öppettider-block
- [ ] Kontaktinfo-block
- [ ] Länk-block

### Medellång sikt (Q2 2026)
- [ ] Lager/samlingar för resor och projekt
- [ ] Delning mellan användare (viewer/editor-roller)
- [ ] Publik vy med sharable links
- [ ] Avancerad användarhantering
- [ ] Export/import av data (JSON backup)
- [ ] Statistik och rapporter

### Lång sikt (Q3-Q4 2026)
- [ ] Mobil app (React Native eller PWA+)
- [ ] Push-notiser
- [ ] AI-genererade beskrivningar
- [ ] Teamfunktioner och samarbete
- [ ] AR-funktioner för platser
- [ ] Integration med externa tjänster

## 🤝 Bidra

Detta är för närvarande ett privat projekt för utveckling och testning.

## 📄 Licens

Privat projekt - ingen licens ännu.

## 📞 Kontakt

Projektägare: Joakim (Product Manager/Owner/Architect)

## 🙏 Acknowledgments

- Firebase för backend-tjänster
- Tailwind CSS för styling-ramverk
- Lucide för ikoner
- Unsplash för exempelbilder
- Vite för snabb utveckling

---

**Senast uppdaterad:** 2026-01-26  
**Version:** 1.3 (Admin-verktyg & Stabilitet)  
**Status:** ✅ Live på GitHub Pages med full funktionalitet