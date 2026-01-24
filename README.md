# OurSpots

En mobilfokuserad app för att hantera fastigheter, smultronställen, kaféer, resor och andra platser med delningsfunktioner.

## 🎯 Vision

OurSpots är en platsbaserad app med premium dark theme som låter användare:
- Skapa och organisera objekt (fastigheter, kaféer, naturplatser, etc.)
- Bygga objekt med modulära block (bilder, platser, text, checklistor)
- Dela objekt med andra (viewer/editor-roller)
- Organisera i lager och kategorier
- Se objekt på karta med avstånd och navigation
- Publik vy för externa användare

## 🏗️ Nuvarande Status (MVP v0.1)

### ✅ Implementerat
- Dark theme med glassmorphism
- Modulär block-arkitektur (title, image, location, text)
- Kategori-navigation med swipe-bar
- Kort-baserad listvy
- Detaljvy med modal
- Fördefinierade typ-ikoner (🏡, ☕, 🏞️, ⭐, ✈️)
- Responsiv design
- Exempel-data med 3 objekt

### 🚧 Kommande Features
- Firebase integration (databas, auth, storage)
- Kartintegration (Mapbox/Leaflet)
- Hierarki (parent → child objekt)
- Lager/samlingar
- Delningsfunktion
- Filter (avstånd, typ, favoriter)
- Admin-funktioner
- Publik vy
- Fler block-typer (checklist, todo, etc.)

## 📦 Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS v3
- **Icons:** Lucide React
- **Hosting:** GitHub Pages (planerat)
- **Database:** Firebase Firestore (planerat)
- **Auth:** Firebase Auth (planerat)
- **Storage:** Firebase Storage (planerat)

## 🚀 Kom igång

### Förutsättningar
- Node.js v20+ ([ladda ner](https://nodejs.org/))
- Git ([ladda ner](https://git-scm.com/))
- GitHub-konto
- VS Code (rekommenderat)

### Installation

1. **Klona projektet:**
   ```bash
   git clone https://github.com/[ditt-username]/ourspots.git
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

### Bygg för produktion

```bash
npm run build
```

Byggda filer hamnar i `dist/`-mappen.

## 📁 Projektstruktur

```
ourspots/
├── src/
│   ├── App.jsx           # Huvudkomponent med all logik
│   ├── main.jsx          # Entry point
│   ├── index.css         # Tailwind imports
│   └── assets/           # Bilder och media
├── public/               # Statiska filer
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.js        # Vite konfiguration
├── tailwind.config.js    # Tailwind konfiguration
├── postcss.config.js     # PostCSS konfiguration
├── README.md             # Denna fil
└── MANIFEST.md           # Komplett produktspecifikation
```

## 🗺️ Datamodell (Planerad)

### Object
```javascript
{
  id: string,
  parentId?: string,
  layerId: string,
  type: "🏡" | "🏠" | "☕" | "🏞️" | "⭐" | "✈️",
  blocks: Block[],
  ownerId: string,
  sharedWith?: { userId: string, role: "viewer" | "editor" }[],
  public?: boolean,
  metadata: {
    createdAt: Date,
    updatedAt: Date
  }
}
```

### Block (Modulär struktur)
```javascript
{
  id: string,
  type: "title" | "image" | "location" | "text" | "checklist" | "todo",
  data: any,
  metadata?: {
    order: number,
    collapsed: boolean,
    required: boolean,
    readonly: boolean
  }
}
```

### Layer
```javascript
{
  id: string,
  name: string,
  type: "default" | "trip" | "project" | "public",
  color?: string,
  icon?: string
}
```

### Category
```javascript
{
  id: string,
  name: string,
  icon: string,
  accentColor: string,
  swipebar: boolean,
  filter: FilterCondition
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

### Lägga till nya block-typer

1. Skapa en ny block-komponent:
```javascript
const ChecklistBlock = ({ data }) => (
  <div className="space-y-2">
    {data.items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <input type="checkbox" checked={item.done} />
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
# Rensa cache och installera om
rm -rf node_modules/.vite
npm run dev
```

### Port 5173 upptagen
Ändra port i `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    port: 3000
  }
})
```

### VS Code kan inte spara filer
- Kontrollera diskutrymme
- Starta om VS Code
- Kör VS Code som administratör (Windows)

## 📝 Nästa Steg

1. **Firebase Setup**
   - Skapa Firebase-projekt
   - Konfigurera Firestore
   - Implementera authentication
   - Lägg till CRUD-operationer

2. **Kartintegration**
   - Välj kartleverantör (Mapbox/Leaflet)
   - Implementera kartvy
   - Lägg till markers
   - GPS-integration

3. **Hierarki**
   - Parent/child-relationer
   - Breadcrumb-navigation
   - Nested views

4. **Delning**
   - Share modal
   - Access control
   - Viewer/Editor-logik

5. **Deploy**
   - GitHub Pages setup
   - CI/CD med GitHub Actions
   - Custom domain (valfritt)

## 📚 Dokumentation

- **MANIFEST.md** - Komplett produktspecifikation
- **README.md** - Denna fil (snabbstart och översikt)
- Se även originalmanifestet för fullständig vision och roadmap

## 🤝 Bidra

Detta är ett privat projekt, men dokumentationen är detaljerad för att underlätta utveckling i nya chattsessioner med AI-assistenter.

## 📄 Licens

Privat projekt - ingen licens ännu.

## 📞 Kontakt

Projektägare: Joakim (Product Manager/Owner/Architect)

---

**Senast uppdaterad:** 2026-01-24  
**Version:** 0.1.0 (MVP Demo)  
**Status:** ✅ Dark theme fungerar, basic struktur på plats