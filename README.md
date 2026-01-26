# OurSpots

En mobilfokuserad app för att hantera fastigheter, smultronställen, kaféer, resor och andra platser med delningsfunktioner.

🌐 **Live Demo:** [https://gilljams.github.io/ourspots/](https://gilljams.github.io/ourspots/)

## 🎯 Vision

OurSpots är en platsbaserad app med premium dark theme som låter användare:
- Skapa och organisera objekt (fastigheter, kaféer, naturplatser, etc.)
- Bygga objekt med modulära block (bilder, platser, text, checklistor)
- Dela objekt med andra (viewer/editor-roller)
- Organisera i lager och kategorier
- Se objekt på karta med avstånd och navigation
- Publik vy för externa användare

## 🏗️ Nuvarande Status (v0.9 - Favoriter & Admin-verktyg)

### ✅ Implementerat
- **Dark theme med glassmorphism** - Premium design med radial glows
- **Modulär block-arkitektur** - title, image, location, text, checklist, todo
- **Checklist block** - Kryssrutor med state-synk i modal
- **Todo block** - Uppgiftslista med progress-bar
- **Bilduppladdning** - Cloudinary integration (25GB gratis/månad)
- **Dynamiska kategorier** - Firebase-baserad kategorihantering med 22+ ikoner
- **Admin-sektion** - Kategorihantering och objekthantering för administratörer
- **Kategori-navigation** - Swipe-bar för filtrering
- **Kort-baserad listvy** - Med bilder och platsinformation
- **Detaljvy** - Modal med komplett objektinformation
- **Ikoner från Lucide React** - 22+ välbara ikoner inklusive mat, nöjen, aktiviteter
- **Firebase Firestore** - Real-time databas med persistent lagring
- **Firebase Authentication** - Google-inloggning med rollhantering
- **Security Rules** - Bara ägare kan redigera sina objekt
- **CRUD-funktionalitet** - Create, Read, Update, Delete
- **Ägarskap** - Objekt märks med "Ditt" för inloggad användare
- **GitHub Pages** - Live deployment med optimerad bundle
- **Optimistic updates** - Omedelbar UI-feedback för checklist/todo
- **Responsive design** - Mobiloptimerad, testad på iOS/Android
- **Hierarki (Parent-Child)** - Organisera objekt som förälder-barn, dela plats mellan nivåer
- **Kartintegration** - Leaflet + react-leaflet med CARTO voyager tiles
- **Fullscreen kartvy** - Floating toggle-knapp för att växla mellan list- och kartvy
- **Markörtooltips** - Desktop: hover-tooltip, Mobile: tap popup med "Visa detaljer"-knapp
- **GPS-positionering** - Fångar användares aktuella position automatiskt vid app-start
- **Interaktiv kartplockning** - Modal för att välja plats genom att klicka på kartan
- **Egen position på karta** - Blå användarikon på huvudkarta och kartväljare
- **Avstånd från användare** - Visa km-avstånd till varje objekt (Haversine-formel)
- **Avståndssorterad lista** - Toggle-knapp för att sortera objekt från närmast till längst bort
- **Location inheritance** - Barn kan ärva förälderns position om de inte har egen
- **Breadcrumb-navigering** - Visa hierarki: Alla > Förälder > Barn
- **Child-count badges** - Visa antal barn på parent-kort
- **Marker clustering** - Stora, tydliga kluster som skalar med antal
- **Markörfärger per kategori** - Dynamiska färger baserat på kategoriinställningar
- **Dynamiska block med titlar** - Flera text/checklist/todo med egna titlar
- **Expand/Collapse-block** - Kolliderade som standard (första öppen), thumbnail-bild, kompakt plats
- **Drag & drop blockordning** - Dra för att sortera; upp/ner-pilar för mobil
- **Stäng detaljmodal via overlay** - Klick utanför modalen för att stänga
- **Sök & filter** - Sök på objektnamn/innehåll, filtrera på kategori och avstånd (km-slider)
- **Förbättrad parent-navigering** - SVG-ikon och tydlig placering för tillbaka-knapp
- **Favoriter** - Markera objekt som favoriter med stjärn-ikon, egen filterkategori, persistent i Firebase
- **Skärmhantering** - "Håll skärmen påslagen" med Wake Lock API för navigering
- **Admin-objekthantering** - Admin kan redigera och radera alla objekt (inklusive ägarlösa)

### 🚧 Kommande Features (Prioriterad backlog)
1. **Fler blocktyper** - Betyg, öppettider, kontaktinfo, anteckningar
2. **Delningsfunktion** - Dela objekt med viewer/editor-roller
4. **Lager/samlingar** - Gruppera objekt för resor och projekt
5. **Publik vy** - Sharable links för externa användare
6. **PWA** - Installera som app, offline-support
7. **Avancerad admin** - Användarhantering, statistik, backup

## 🎨 Admin-funktioner

### Kategorihantering (endast för administratörer)
- **Skapa kategorier** - Namn, ikon från 22+ valmöjligheter, anpassad färg
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
- **Redigera alla objekt** - Admin kan redigera vilket objekt som helst
- **Radera alla objekt** - Admin kan radera objekt oavsett ägare (användbart för att rensa gamla testdata)
- **Hantera ägarlösa objekt** - Möjlighet att städa upp objekt skapade innan användarsystemet implementerades

### Så här blir du admin:
1. Logga in i appen med Google
2. Öppna Firebase Console → Firestore Database
3. Gå till `users` collection och hitta ditt användar-dokument
4. Sätt fältet `isAdmin` till `true` (boolean)
5. Ladda om appen - Admin-sektion visas nu i menyn

## 📦 Tech Stack

- **Frontend:** React 18 + Vite (hot reload)
- **Styling:** Tailwind CSS v3 + Glassmorphism
- **Icons:** Lucide React + Emoji
- **Maps:** Leaflet + react-leaflet (CARTO tiles, fully free)
- **Database:** Firebase Firestore (real-time, persistent)
- **Authentication:** Firebase Auth (Google Sign-in)
- **Image Storage:** Cloudinary (unsigned uploads, 25GB gratis/månad)
- **Geolocation:** Browser Geolocation API (GPS)
- **Hosting:** GitHub Pages
- **Version Control:** Git + GitHub
- **CI/CD:** npm scripts för deployment

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

### Deploya till GitHub Pages

```bash
npm run deploy
```

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
  type: "🏡" | "🏠" | "☕" | ..., // Fördefinierad typ
  layerId: string,               // Default: "default"
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
  type: "title" | "image" | "location" | "text",
  data: {
    // title: { text: string }
    // image: { url: string }
    // location: { lat: number, lng: number, address: string }
    // text: { content: string }
  }
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

### v0.3 - Block & Upload MVP (2026-01-25)
- ✨ Checklist block med checkbox-toggle
- ✨ Todo block med progress-bar
- ✨ Cloudinary image upload (25GB gratis/månad)
- 🔄 Optimistic updates - omedelbar UI-feedback
- 🎨 Förbättrad kontrast i dark theme
- 📱 Responsiv kategori-bar
- 🐛 Sticky header/category bar alignment fix

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

### Kort sikt (nästa sprint)
- [x] Checklist block med state-synk
- [x] Todo block med progress-bar
- [x] Bilduppladdning (Cloudinary)
- [ ] Ratings-block
- [ ] Sökning och filtrering
- [ ] Favoriter/stjärnmarkering

### Medellång sikt
- [ ] Kartintegration (Mapbox/Leaflet)
- [ ] Hierarki (parent/child-relationer)
- [ ] Lager/samlingar för resor
- [ ] Delning mellan användare
- [ ] Offline-support (PWA)

### Lång sikt
- [ ] Mobil app (React Native)
- [ ] AR-funktioner för platser
- [ ] AI-genererade beskrivningar
- [ ] Export/import av data
- [ ] Teamfunktioner

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

**Senast uppdaterad:** 2026-01-24  
**Version:** 0.2.0 (Authentication MVP)  
**Status:** ✅ Live på GitHub Pages med Firebase Authentication