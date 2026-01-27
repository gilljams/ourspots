========================
OurSpots – Manifest / Blueprint (Updated Jan 27, 2026)
========================

🚀 STATUS: v1.5 - Sharing System & Security (In Progress)

1. VISION
- Mobilfokuserad app med premium dark theme
- Hanterar fastigheter, smultronstellen/kaféer, resor/projekt
- Delade objekt (viewer/editor) - planerad funktion
- Objekt + block = återanvändbar struktur ✅
- Hierarki för objekt (parent → child) ✅
- Favoriter med kombinerad filtrering (favoriter + kategori) ✅
- Smart bildhantering med AI-beskärning och GPS-extrahering ✅
- Skärmhantering med Wake Lock API ✅
- Lager/samlingar för resor/projekt - planerad funktion
- Dynamiska kategorier med Firebase-baserad hantering ✅
- Kategorihantering för administratörer ✅
- Admin objekthantering (redigera/radera alla objekt) ✅
- Kartintegration med position och avstånd ✅
- Egen positionsmarkör (användarikon) på karta ✅
- Dark theme + glassmorphism + accentfärger ✅
- Publik vy för gäster eller externa användare - planerad funktion
- Modulära block/förmågor: nya block kan implementeras utan att ändra objektmodell ✅
- Default block set per typ/kategori för enkelhet - delvis implementerat
- Namn: OurSpots – signalerar familjär, delad och personlig platsbok ✅
- Optimerad bundle med tree-shaking (575 kB mindre icon-bundle) ✅
- Race condition-säkerhet för robusta uppdateringar ✅
- Collapsed hantera-sektion för renare läsupplevelse ✅
- Reset-funktionalitet för återkommande Todo/Checklist ✅

2. KATEGORI-SYSTEM
- Dynamiska kategorier lagrade i Firebase ✅
- Admin kan skapa, redigera, radera kategorier ✅
- 24 valbara ikoner från Lucide React (optimerad import) ✅
- Anpassad färg per kategori ✅
- Sorterbar ordning (upp/ner pilar) ✅
- Automatisk hantering av objekt vid kategori-radering ✅
- Reordnad layout: Favoriter → Alla → Kategorier ✅

Tillgängliga ikoner:
- Bas: Home, Coffee, Mountain, Star, MapPin, Calendar, Folder, Navigation, Plane, RotateCcw
- Mat & dryck: UtensilsCrossed, Pizza, Wine, Beer
- Nöjen: Gamepad2, Music, Film, PartyPopper
- Aktiviteter: Bike, Dumbbell, Waves
- Natur: TreePine, Shell, Sprout

3. ARKITEKTUR / DATAMODELL
Object:
- id: string
- parentId?: string
- layerId: string
- type: kategori-id från categories collection
- blocks: Block[]
- ownerId: string
- shares?: { [email: string]: { role: "viewer" | "editor", sharedAt: Timestamp, email: string } } ✅
- isPublicShared?: boolean ✅
- publicShareToken?: string (UUID för publik delning) ✅
- systemblock: createdAt, updatedAt, Objekt-ID, ParentID, LayerID

Block:
- type: "image", url, cropMode (auto/face/center)
- type: "location", lat, lng
- type: "text", content
- type: "checklist", items[]
- type: "todo", items[]
- Modulära block kan adderas senare

Category: ✅ IMPLEMENTERAT
- id: string (auto-genererat från label)
- label: string (visningsnamn)
- icon: string (Lucide icon name)
- color: string (hex-färg)
- order: number (sorteringsordning)
- createdAt: Timestamp
- createdBy: string (userId)

User: ✅ IMPLEMENTERAT
- id: string (Firebase Auth UID)
- email: string
- isAdmin: boolean
- favorites: string[] (array av objekt-ID:n)
- createdAt: Timestamp

Layer:
- id: string
- name: string
- type: "default" | "trip" | "project" | "public"
- color?: string
- icon?: string

Default block sets per typ/kategori (för enkelhet):
- Fastighet: Title, Location, Image
- Hus: Title, Image, Text, Checklist
- Garage: Title, Image, Checklist
- Smultronställe: Title, Image, Location
- Kafé / Restaurang: Title, Image, Location, Text
- Natur / Utflykt: Title, Image, Location, Checklist

4. UX / UI-KONSEPT
- Swipe mellan kategorier
- Breadcrumb för hierarki
- Listvy med kort: titelbild, position, typ-chip
- Detaljvy: full block-vy, hierarki via kort/chips för barnobjekt
- Floating add button, filter / distance slider
- Kartlager med markörer för alla objekt
- Marker glow för egna tips i närheten
- Delade objekt med access control
- Publik vy: mobiloptimerad vy med karta och kort för externa användare
- Default block set per typ/kategori för enkelhet
- Fördefinierade typ-ikoner används överallt

5. FILTER / INTERAKTIVITET
- Sökning på namn och innehåll (text/todo/checklist) ✅
- Filter på: kategori/typ, avstånd från användare (km-slider) ✅
- Lager + kategori styr vy
- Real-time uppdatering av lista och karta
- Position-block kan: öppna karta, visa avstånd
- Publik vy: markerar public=true objekt

6. KARTFUNKTION / POSITION (IMPLEMENTERAT) ✅
- Visa alla objekt med position på kartan ✅
- Fullscreen kartvy med floating toggle-knapp ✅
- Markörtooltips desktop/popup mobile ✅
- Fånga användarens GPS-position automatiskt ✅
- Interaktiv kartplockning i create-modal ✅
- Visa avstånd från användare till varje objekt ✅
- Sortera objekt efter avstånd (toggle) ✅
- Breadcrumb-navigering för hierarki ✅
- Location inheritance för barn-objekt ✅
- Marker clustering med stora synliga kluster ✅
- Markörfärger per kategori (🏡=grå, ☕=brun, 🏞️=grön, ⭐=gul, ✈️=blå) ✅
- Visa egen position med användarikon på karta och kartväljare ✅

7. NÄSTA PRIORITERING (Q1 2026)
✅ Grundläggande sharing (v1.5)
  - ShareModal med email-input, rollväljare (viewer/editor)
  - Publik delning med unika tokens
  - PublicObjectView för read-only visning
  - Behörighetsfiltrering (bara se egna objekt)

🔄 Pågående (v1.5)
  - Fixa block-visning på delad sida (block renderas inte korrekt)
  - Hämta objekt delade med användaren (shares[email] query)
  - Firestore Security Rules för shares och publika objekt
  
📋 Planerat (v1.6+)
  - Badges på kort när objekt är delat
  - Filter: Mina/Alla objekt
  - Markdown editor för textfält (bullet lists, bold, bilder)
  - PWA-implementation (manifest.json, service worker, installbar)
  - Fler blocktyper (Link, Audio/Video, PDF, Väder, Timer, Kontakt)
  - Lager/samlingar för resor och projekt

8. DELNING / SHARING SYSTEM ✅ DELVIS IMPLEMENTERAT

### ShareModal (Implementerat v1.5)
- ✅ Email-baserad delning med rollväljare (Viewer/Editor)
- ✅ Hantera delade användare (visa lista, ta bort access)
- ✅ Publik delning med toggle
- ✅ Kopiera delningslänk med UUID-token
- ✅ Integrerad i ObjectDetail "Hantera objekt"-sektion
- ✅ Badge visar antal delade användare + globe-ikon för publik

### PublicObjectView (Implementerat v1.5)
- ✅ Read-only vy för publika delningslänkar (#/share/:token)
- ✅ Visar alla block (titel, bild, location, text, checklist, todo)
- ✅ Design liknar huvudappen (samma header, bakgrund)
- ✅ Login-banner för att konvertera besökare
- ✅ "Till appen"-knapp för navigering

### Behörighetskontroll (Implementerat v1.5)
- ✅ Filtrera objekt baserat på ownerId
- ✅ Ej inloggade ser inga objekt
- ✅ Inloggade ser bara sina egna objekt

### Kvarstående (v1.5)
- 🔄 Fixa block-rendering i PublicObjectView (text/todo-block visas inte)
- 🔄 Hämta objekt delade MED användaren (shares query)
- 🔄 Firestore Security Rules uppdatering:
  ```javascript
  // Owner access
  allow read: if resource.data.ownerId == request.auth.uid
  
  // Shared access (viewer/editor)
  allow read: if request.auth != null && 
              resource.data.shares[request.auth.token.email].role in ['viewer', 'editor']
  
  // Public shared access
  allow read: if resource.data.isPublicShared == true
  
  // Editor can update
  allow update: if resource.data.shares[request.auth.token.email].role == 'editor'
  ```

### Planerade förbättringar (v1.6+)
- Email → UID mapping för snabbare queries
- Badges på objektkort för delad status
- Filter: Mina/Alla objekt
- Dela barn-objekt tillsammans med förälder (shareChildren option)

9. ADMINISTRATIVA FUNKTIONER ✅ IMPLEMENTERAT

### Kategorihantering (Implementerat v1.1)
- ✅ Skapa nya kategorier med namn, ikon, färg
- ✅ Redigera befintliga kategorier
- ✅ Radera kategorier med automatisk objekthantering
- ✅ Ordna kategorier (flytta upp/ner)
- ✅ Visa antal objekt per kategori
- ✅ Dark mode-optimerad UI
- ✅ Real-time synkronisering med Firebase

### Objekthantering (Implementerat v1.1)
- ✅ Admin kan redigera alla objekt oavsett ägare
- ✅ Admin kan radera alla objekt oavsett ägare
- ✅ Hantera ägarlösa objekt (skapade innan användarsystem)
- ✅ Firebase Security Rules uppdaterade för admin-behörighet

### Delningshantering (Implementerat v1.5)
- ✅ ShareModal för att dela objekt med andra
- ✅ Email-baserad användardelning med roller
- ✅ Publik delning med kopierbar länk
- ✅ Behörighetskontroll (bara se egna objekt)

### Användarhantering (Implementerat v1.0)
- ✅ Favoriter: Markera objekt med stjärn-ikon
- ✅ Kombinerad filtrering: Favoriter + kategori samtidigt
- ✅ Toggle-filter: Favoriter fungerar som på/av-filter
- ✅ Persistent lagring i Firestore users/{uid}/favorites

### Bildhantering (Implementerat v1.2)
- ✅ Cloudinary smart cropping: AI-baserad beskärning (Auto/Face/Center)
- ✅ Automatisk komprimering: Client-side resize till max 2000px, 85% kvalitet
- ✅ GPS-extrahering: Läser EXIF-data från bilder automatiskt
- ✅ Fallback-hantering: Uppladdning fungerar även om resize/GPS misslyckas
- ✅ Optimerade transformationer: Olika storlekar för kort, detail, thumbnails

### Inställningar (Implementerat v1.3)
- ✅ "Håll skärmen påslagen" med Wake Lock API
- ✅ Persistent inställning i localStorage
- ✅ Automatisk hantering vid visibility changes
- ✅ Quick Capture-knapp för snabb objektskapande från favorit

### Admin-åtkomst (Implementerat v1.1)
- ✅ isAdmin-flagga i users collection
- ✅ Admin-sektion synlig endast för administratörer
- ✅ Skydd mot obehörig åtkomst

### Planerade admin-funktioner (v1.6+)
- Lager: lägg till, redigera, ta bort, färg, ikon, typ
- Objekt: flytta mellan lager, flytta i hierarki, redigera metadata, public flag
- Delning / access: lägg till / ta bort användare, set roll Viewer/Editor
- Block: lägg till / editera / ta bort block, ändra ordning (drag & drop)
	(drag & drop och touch-pilar implementerat i skapad modal)
- Filter & defaultvy: bestäm standardfilter per kategori/lager
- Preview: se hur det ser ut på mobil (privat / publik vy)
- Versionshistorik / undo (om möjligt)
- Import / export av objekt (valfritt)
- Användarhantering och statistik

9. TEKNISK STACK (GRATISTJÄNSTER)
- Frontend: React 19.2.0 + Vite, host GitHub Pages
- Databas: Firebase Firestore
- Authentication: Firebase Auth (Google Sign-In)
- Routing: Hash-based (#/share/:token för publika länkar)
- Bilduppladdning: Cloudinary (25GB/månad gratis, unsigned uploads)
- Bildprocessing: Client-side Canvas API för resize, Cloudinary AI transformations
- EXIF-läsning: Custom JavaScript implementation för GPS-extrahering
- Kartor: React Leaflet med OpenStreetMap tiles
- Ikoner: Lucide React (tree-shaken, ~21kB)
- CI/CD: GitHub Actions med gh-pages deploy
- PWA möjlig för offline / haptics (planerad)
- Design: dark theme, glassmorphism, accentfärger per kategori/typ
- Wake Lock API: Håller skärmen påslagen vid behov
- Clipboard API: Kopiera delningslänkar

10. MVP / FEATURE-ÖVERSIKT
- Objekt + block
- Hierarki (parent → child)
- Kategorier som swipe
- Lager (samlingar, resor, public layer)
- Delning (viewer/editor) - delvis implementerat ✅
- Filter (avstånd / typ / favorit)
- Kartintegration med marker och glow för nära objekt
- Floating add button
- Breadcrumbs
- Dark theme + glassmorphism
- Publik vy med karta och kort för externa användare - implementerat ✅
- Adminfunktioner (kategorier, lager, objekt, block, delning)
- Fördefinierade typ-ikoner
- Modulära block/förmågor + default sets per kategori/typ

11. KÄNDA PROBLEM & KVARSTÅENDE ARBETE (v1.5)

### Högprioriterade buggar
1. **PublicObjectView block-rendering** 🔴
   - Symptom: Text- och todo-block med innehåll visas inte
   - Möjlig orsak: Tomma block filtreras bort för tidigt, eller block.content är undefined
   - Status: Väntar på debugging nästa session

2. **Delade objekt visas inte i listan** 🔴
   - Symptom: Objekt delade MED användaren syns inte
   - Orsak: Query hämtar bara where('ownerId', '==', user.uid)
   - Lösning behövs: Två queries (owner + shared) eller composite index
   - Status: TODO i kod, behöver implementeras

### Säkerhetsuppdateringar behövs
3. **Firestore Security Rules** 🟡
   - Nuvarande: `allow read: if true` (för bred åtkomst)
   - Behöver: Owner + Shared + Public filtering
   - Rules finns dokumenterade i manifest
   - Status: Redo att applicera i Firebase Console

### UX-förbättringar planerade
4. **Dela-modal förbättringar** 🟢
   - Badge på objektkort när delat
   - Filter: Mina/Alla objekt
   - Email-validering och bättre felmeddelanden
   - Status: Planerad v1.6

5. **Markdown editor** 🟢
   - Rich text för anteckningar (bold, bullets, bilder)
   - Liknande iPhone Anteckningar
   - react-md-editor eller liknande
   - Status: Research behövs

### Firestore Security Rules (Redo att applicera)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // For sharing
    }
    
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /objects/{objectId} {
      // Read: Owner, Shared, Public (keep "if true" during dev)
      allow read: if true // Remove when ready to lock down
                  || resource.data.ownerId == request.auth.uid
                  || (request.auth != null && resource.data.shares[request.auth.token.email].role in ['viewer', 'editor'])
                  || resource.data.isPublicShared == true;
      
      allow create: if request.auth != null;
      
      allow update: if request.auth != null && 
                       (request.auth.uid == resource.data.ownerId
                        || isAdmin()
                        || resource.data.shares[request.auth.token.email].role == 'editor');
      
      allow delete: if request.auth != null && 
                       (request.auth.uid == resource.data.ownerId || isAdmin());
    }
  }
}
```

### Deployment info
- Repo: https://github.com/gilljams/ourspots
- Live: https://gilljams.github.io/ourspots/
- Deploy: `npm run deploy` (builds + pushes to gh-pages)
- Latest: commit 84ca332 (Security: Filtrera objekt baserat på ownerId)