========================
OurSpots – Manifest / Blueprint (Updated Jan 31, 2026)
========================

🚀 STATUS: v2.3 - Fullscreen Text Editor & UX Improvements

1. VISION
- Mobilfokuserad app med premium dark theme
- Hanterar fastigheter, smultronstellen/kaféer, resor/projekt
- Delade objekt med viewer/editor-roller ✅
- Pending/accepted/inherited delningsstatus ✅
- Lämna delning-funktion för mottagare ✅
- Dela med barn (rekursiv delning av hierarki) ✅ NY
- Objekt + block = återanvändbar struktur ✅
- Hierarki för objekt (parent → child) ✅
- ancestorIds för snabb hierarkiuppslagning ✅ NY
- Kaskad-radering av objekt med barn ✅ NY
- Föräldralösa barn visas som toppnivå med breadcrumb ✅
- Favoriter med kombinerad filtrering (favoriter + kategori) ✅
- Filter "Mina" för att visa endast egna objekt ✅
- Smart bildhantering med AI-beskärning och manuell GPS-extrahering ✅
- "Plats från bild"-knapp för kontrollerad GPS-utläsning ✅
- Platsoberoende kategorier (hideLocation) ✅
- Skärmhantering med Wake Lock API ✅
- GPS-lägen: Snabb (standard) och Precis (±10m) ✅
- Lager/samlingar för resor/projekt - planerad funktion
- Dynamiska kategorier med Firebase-baserad hantering ✅
- Kategorihantering för administratörer ✅
- Admin objekthantering (redigera/radera alla objekt) ✅
- Admin användarhantering (lista, blockera, admin-roller) ✅ NY
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
- Grid/List toggle för barn-objekt med localStorage-persistens ✅
- Objektkopiering för återkommande events (resor, recept) ✅
- DateTag-block för års- och datumintervallmärkning ✅
- Bevarar extra location-blocks (kantarellställen) vid redigering ✅ NY
- Timer-block med compact/expanded läge och iOS-kompatibelt ljud ✅ NY
- Konsekvent SVG-ikoner (ersatt emojis i inbjudningar och share modal) ✅ NY
- Block-ordning respekterar användarens sortering ✅ NY
- iOS scroll-fix för inputfält i modaler ✅ NY
- Fullscreen text editor för mobil (iOS Notes-liknande) ✅ NY v2.3
- Grupperade blocktyper med "Fler"-knapp ✅ NY v2.3

2. KATEGORI-SYSTEM
- Dynamiska kategorier lagrade i Firebase ✅
- Admin kan skapa, redigera, radera kategorier ✅
- 28 valbara ikoner från Lucide React (optimerad import) ✅
- Anpassad färg per kategori ✅
- Sorterbar ordning (upp/ner pilar) ✅
- Automatisk hantering av objekt vid kategori-radering ✅
- Reordnad layout: Favoriter → Alla → Kategorier ✅
- Dropdown-ikonväljare med visuella ikoner ✅ NY
- Platsoberoende kategorier (hideLocation flag) ✅ NY

Tillgängliga ikoner:
- Bas: Home, Coffee, Mountain, Star, MapPin, Calendar, Folder, Navigation, Plane, RotateCcw
- Mat & dryck: UtensilsCrossed, Pizza, Wine, Beer
- Nöjen: Gamepad2, Music, Film, PartyPopper
- Aktiviteter: Bike, Dumbbell, Waves
- Natur: TreePine, Shell, Sprout
- Verktyg & övrigt: Wrench, BookOpen, Trophy, ClipboardList ✅ NY

3. ARKITEKTUR / DATAMODELL
Object:
- id: string
- parentId?: string
- parentPath?: string[] (breadcrumb-namn på föräldrar, för delning) ✅
- ancestorIds?: string[] (alla förfäder för snabb uppslagning) ✅ NY
- layerId: string
- type: kategori-id från categories collection
- blocks: Block[]
- ownerId: string
- shares?: { [emailKey: string]: { role: "viewer" | "editor", status: "pending" | "accepted" | "inherited", sharedAt: Timestamp, email: string } } ✅
- sharedWithEmails?: string[] (för Firestore array-contains queries) ✅
- isPublicShared?: boolean
- publicShareToken?: string (UUID för publik delning)
- systemblock: createdAt, updatedAt, Objekt-ID, ParentID, LayerID

Shares-system: ✅ IMPLEMENTERAT
- Email-nycklar escaped med _DOT_ (t.ex. "user_DOT_name@gmail_DOT_com")
- Viewer: Kan se objekt, inte redigera
- Editor: Kan redigera objekt och blocks
- Pending: Inbjudan skickad, väntar på accept
- Accepted: Användaren har accepterat delning
- Inherited: Automatiskt delad via förälder (ingen notifikation) ✅ NY
- Lämna delning: Mottagare kan ta bort sig själv

Block:
- type: "image", url, cropMode (auto/face/center)
- type: "location", lat, lng
- type: "text", content (stöder markdown: **bold**, *italic*, [länkar](url), > citat, # rubriker) ✅ NY
- type: "text" fullscreen editor på mobil med iOS-optimerad tangentbordshantering ✅ NY v2.3
- type: "checklist", items[]
- type: "todo", items[]
- type: "links", title, items[{title, url, icon}] ✅
- type: "table", title, template, columns[], rows[] ✅
- type: "datetag", tags[{type: "year"|"range", year?, startDate?, endDate?}] ✅
- type: "contact", phone, email, website ✅ NY
- type: "timer", timers[{label, duration}] (med iOS-ljud och compact view) ✅ NY
- Modulära block kan adderas senare

Category: ✅ IMPLEMENTERAT
- id: string (auto-genererat från label)
- label: string (visningsnamn)
- icon: string (Lucide icon name)
- color: string (hex-färg)
- order: number (sorteringsordning)
- hideLocation?: boolean (platsoberoende kategori) ✅ NY
- createdAt: Timestamp
- createdBy: string (userId)

User: ✅ IMPLEMENTERAT
- id: string (Firebase Auth UID)
- email: string
- displayName?: string
- isAdmin: boolean
- blocked?: boolean ✅ NY
- blockedAt?: Timestamp ✅ NY
- favorites: string[] (array av objekt-ID:n)
- createdAt: Timestamp
- updatedAt?: Timestamp

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
  
📋 Planerat (v1.8+)
  - Badges på kort när objekt är delat
  - Filter: Mina/Alla objekt
  - ✅ Markdown editor för textfält (bullet lists, bold, bilder) - KLART v2.1
  - ✅ Timer-block med countdown och ljud - KLART v2.2
  - PWA-implementation (manifest.json, service worker, installbar)
  - Fler blocktyper (Audio/Video, PDF, Väder)
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

### Planerade förbättringar (v2.1+)
- Email → UID mapping för snabbare queries
- Badges på objektkort för delad status
- Markdown editor för textfält (bullet lists, bold, bilder)
- PWA-implementation (manifest.json, service worker, installbar)

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

### LinksBlock (Implementerat v1.7) ✅ NY
- ✅ Ett eller flera länkar med titel och URL
- ✅ Ikonväljare med 11 ikoner (Link, ExternalLink, Globe, FileText, ShoppingCart, etc.)
- ✅ Collapsible visning när >1 länk (visar antal i header)
- ✅ Kompakt visning för enstaka länkar (inline med rubrik)
- ✅ Klickbara länkar öppnas i ny flik
- ✅ iOS-optimerad (16px font förhindrar zoom)

### TableBlock (Implementerat v1.7) ✅ NY
- ✅ 6 färdiga mallar:
  - Önskelista (Vem, Vad, Från, ✓)
  - Knytkalas (Rätt, Vem, Portioner, ✓)
  - Uppgifter (Uppgift, Ansvarig, ✓)
  - Inköpslista (Vara, Antal, ✓)
  - Gästlista (Namn, Anteckning, ✓)
  - Kontakter (Namn, Telefon)
- ✅ Progress bar för checkboxar (X/Y klara)
- ✅ Klickbara checkboxar direkt i visningsläge
- ✅ Klickbara telefonnummer (tel: länk)
- ✅ Collapsible med radräkning i header
- ✅ Bekräftelsedialog vid mallbyte med data
- ✅ iOS-optimerad (inputMode="numeric" för siffror)

### Föräldralösa barn & Filtrering (Implementerat v1.8) ✅
- ✅ Barn-objekt vars förälder användaren inte ser visas som toppnivå
- ✅ Breadcrumb-rad på kort visar full hierarki (t.ex. "↳ Hälsingland › Stugan")
- ✅ parentPath sparas på objekt för breadcrumb vid delning
- ✅ Sökning visar matchade objekt direkt (inkl. barn)
- ✅ Filter "Mina" - visa endast egna objekt (exkludera delade)
- ✅ Favoriter-räknare exkluderar raderade objekt
- ✅ Admin-funktion: "Uppdatera parentPath" för alla objekt (migration)

### Platsoberoende kategorier (Implementerat v1.8) ✅
- ✅ hideLocation-flagga på kategorier
- ✅ Döljer platsfält vid objektskapande
- ✅ Exkluderar från kartvy
- ✅ Alltid med i avståndsfiltret (räknas som inom räckvidd)

### GPS-extrahering (Förbättrad v1.8) ✅
- ✅ Automatisk GPS-utläsning borttagen vid bilduppladdning
- ✅ Ny knapp "Från bild" i platssektionen
- ✅ Tre knappar på rad: "Min plats", "På karta", "Från bild"
- ✅ "Från bild" visas endast när bild laddats upp
- ✅ Döljs för platsoberoende kategorier

### Barn-visning (Implementerat v1.8) ✅
- ✅ Toggle mellan grid och list för barn-objekt i ObjectDetail
- ✅ Visas endast när >2 barn finns
- ✅ localStorage-persistens för användarens preferens

### DateTag Block (Implementerat v1.9) ✅ NY
- ✅ Märka objekt med årtal (blå chips, t.ex. "2024", "2025")
- ✅ Märka objekt med datumintervall (lila chips, t.ex. "15 jun – 22 jun 2025")
- ✅ Flera taggar per block
- ✅ Lägg till via dropdown-meny med två alternativ
- ✅ År: Nummerfält med current year som default
- ✅ Intervall: Start- och slutdatum med native date pickers
- ✅ Sökbart: Sökning matchar årtal och månadsnamn
- ✅ Kompakt visning som inline-chips

### Objektkopiering (Implementerat v1.9) ✅
- ✅ "Kopiera"-knapp bredvid "Lägg till barn" i Hantera-sektionen
- ✅ Kopierar all data: titel, plats, bild, alla block
- ✅ Titeln får suffix " (kopia)" automatiskt
- ✅ Behåller samma parent som originalet
- ✅ Skapar nytt objekt (nytt ID, ingen koppling till original)
- ✅ Barn-objekt kopieras INTE (bara själva objektet)
- ✅ Kopierar ALLA location-blocks (inkl. kantarellställen) ✅ NY
- ✅ Perfekt för återkommande events: årliga resor, recept, etc.

### Hierarki & ancestorIds (Implementerat v2.0) ✅ NY
- ✅ ancestorIds: Array med alla förfäders ID från rot till direkt förälder
- ✅ Beräknas automatiskt vid skapande/redigering
- ✅ Uppdateras rekursivt när förälder ändras
- ✅ Möjliggör O(n) uppslagning av alla ättlingar
- ✅ Admin-knapp "Synka hierarki" för migration av befintliga objekt
- ✅ Används för: rekursiv delning, kaskad-radering, snabb filtrering

### Kaskad-radering (Implementerat v2.0) ✅ NY
- ✅ Raderar objekt OCH alla dess ättlingar (barn, barnbarn, etc.)
- ✅ Varningsdialog visar antal objekt som kommer raderas
- ✅ Knappen visar "Ta bort X objekt" istället för bara "Ta bort"
- ✅ Endast owner/admin kan radera (editor ser inte knappen)
- ✅ Använder ancestorIds för att hitta alla ättlingar

### Rekursiv delning (Implementerat v2.0) ✅ NY
- ✅ "Inkludera barn" checkbox i ShareModal
- ✅ Delar alla ättlingar (barn, barnbarn, etc.) rekursivt
- ✅ Ättlingar får status "inherited" (ingen notifikation)
- ✅ Nya barn ärver automatiskt förälderns shares
- ✅ Använder ancestorIds för snabb uppslagning

### Extra location-blocks (Förbättrat v2.0) ✅ NY
- ✅ Bevarar alla extra positioner vid redigering
- ✅ Kopierar alla positioner vid duplicering
- ✅ Perfekt för kantarellställen och multi-position objekt

### Användaradministration (Implementerat v2.0) ✅ NY
- ✅ UsersAdminModal: Lista alla användare med statistik
- ✅ Sök och filtrera: Admin/Blockerade/Aktiva
- ✅ Sortering: Namn, antal objekt, skapandedatum
- ✅ Statistik per användare: objekt, delningar
- ✅ Ge/ta admin-behörighet med en knapptryckning
- ✅ Blockera/avblockera användare
- ✅ Blockerade kan inte logga in (får meddelande)
- ✅ Kan inte ändra egen admin-status eller blockera sig själv

### Block Editor UX (Förbättrad v1.9) ✅ NY
- ✅ Expanderande textarea: 3 rader → 8 rader vid fokus
- ✅ Smidig animation med transition-all
- ✅ "Rensa"-knapp i nedre högra hörnet för text/checklista/todo
- ✅ Rensa-knappen syns endast när innehåll finns
- ✅ Kontrollerade komponenter för omedelbar UI-uppdatering

### Markdown-stöd i textblock (Implementerat v2.1) ✅ NY
- ✅ **Fetstil** med dubbla asterisker
- ✅ *Kursiv* med enkla asterisker
- ✅ [Länkar](url) med automatisk https-prefix
- ✅ > Citat med grå bakgrund och vänsterborder
- ✅ # Rubriker (H1-H3) med olika storlekar
- ✅ Punktlistor och numrerade listor
- ✅ Enkel toolbar med 5 knappar: B, I, H, ", Länk
- ✅ Länkar öppnas i ny flik med rel="noopener noreferrer"

### Fullscreen Text Editor (Implementerat v2.3) ✅ NY
- ✅ iOS Notes-liknande fullscreen-läge för textblock på mobil
- ✅ Öppnas automatiskt när man trycker på textblock på mobil
- ✅ visualViewport API för korrekt tangentbordshantering
- ✅ Header med titel och X-knapp (stäng utan spara)
- ✅ Floating check-knapp (✓) för att spara
- ✅ Markdown-toolbar med 8 knappar: B, I, H, ", •, 1., Länk, 🗑️
- ✅ Kompakta knappar (w-8 h-8) med vänsterjustering
- ✅ Rensa-knapp (trash-ikon) med bekräftelsedialog
- ✅ Debounced viewport-uppdateringar (requestAnimationFrame)
- ✅ Body scroll lock för att förhindra bakgrundsscroll
- ✅ Full bakgrundstäckning (ingen genomskinlighet)
- ✅ 16px font-size för att förhindra iOS-zoom
- ✅ Touch-safe knappar (onTouchStart + preventDefault)

### Blocktyps-gruppering (Implementerat v2.3) ✅ NY
- ✅ Primära blocktyper alltid synliga: Text, Lista, URL
- ✅ Kompakta knappar som får plats på en rad
- ✅ "Fler"-knapp expanderar sekundära blocktyper
- ✅ Sekundära: Att göra, Kontakt, Tabell, Datum, Timers
- ✅ Auto-scroll vid expandering (100px nedåt)
- ✅ "Färre"-knapp kollapsar tillbaka

### Contact Block (Implementerat v2.1) ✅ NY
- ✅ Tre fält: Telefon, Email, Webbplats
- ✅ Telefon: Klickbar tel:-länk med ikon
- ✅ Email: Klickbar mailto:-länk med ikon
- ✅ Webbplats: Ikon-knapp (kompakt) med tooltip
- ✅ Enhetlig blå färg för alla ikoner
- ✅ Sorteras efter location-block i detaljvyn

### iOS Touch-optimering (Implementerat v2.1) ✅ NY
- ✅ Global touch-manipulation CSS förhindrar dubbelklick-zoom
- ✅ Swipe-to-close ignorerar interaktiva element (knappar, länkar)
- ✅ Förbättrad inputhantering utan aggressiva blur-handlers

### Planerade admin-funktioner (v2.0+)
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

### ⚠️ OBS! iOS Safari Viewport-problem (Återkommande)
**Problem:** iOS Safari zoomar automatiskt när tangentbordet öppnas och återställer inte alltid viewport korrekt när det stängs. Detta kan orsaka "spök-klick" där touch-händelser registreras på fel element.

**Symptom:**
- Klickar på "Uppdatera" men inget händer
- Klickar på ett fält men ett annat element aktiveras (t.ex. dropdown öppnas)
- Måste pinch-zooma för att få rätt fokus

**Lösning (implementerad i CreateObjectModal):**
```javascript
// iOS viewport fix - lyssnar på focusout och tvingar viewport-reset
useEffect(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return;
  
  const handleFocusOut = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        window.scrollTo(0, window.scrollY);
      }, 100);
    }
  };
  
  document.addEventListener('focusout', handleFocusOut);
  return () => document.removeEventListener('focusout', handleFocusOut);
}, []);
```

**Om problemet återkommer:** Kontrollera att denna fix finns i alla modaler med input-fält. Fixen tvingar Safari att räkna om viewport-koordinater efter att tangentbordet stängts.

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
- Latest: commit 91aa530 (Fix Folder icon size in ObjectDetail)

12. PROJEKTSTRUKTUR (Refaktorerad Jan 29, 2026)

App.jsx har delats upp från ~5000 rader till ~1400 rader genom att extrahera komponenter och utilities.

```
src/
├── App.jsx              (1401 rader) - Huvudapp, state, routing
├── firebase.js          - Firebase konfiguration
├── main.jsx             - Entry point
├── index.css            - Tailwind imports
│
├── utils/
│   ├── imageUtils.js    - Cloudinary, resize, GPS-extrahering
│   ├── geoUtils.js      - Avstånd, formatering
│   ├── mapIcons.js      - Leaflet marker-ikoner
│   └── iconHelpers.js   - Lucide icon helpers, AVAILABLE_ICONS
│
└── components/
    ├── blocks/
    │   └── index.jsx    - TitleBlock, LocationBlock, ImageBlock, etc.
    │
    ├── ObjectCard.jsx   (~180 rader) - Objektkort i listvy
    ├── ObjectDetail.jsx (~440 rader) - Detaljvy med swipe-to-close
    ├── MapView.jsx      (~300 rader) - Kartkomponent med clustering
    ├── MapPicker.jsx    (~200 rader) - Interaktiv kartväljare
    │
    ├── CreateObjectModal.jsx    (~580 rader) - Skapa/redigera objekt
    ├── ShareModal.jsx           (~380 rader) - Delningshantering
    ├── DeleteConfirmModal.jsx   (~50 rader)  - Bekräftelsedialog med ättlingsräknare
    ├── FocalPointPicker.jsx     (~175 rader) - Bildbrännpunkt
    ├── BlockEditor.jsx          (~50 rader)  - Block-redigerare
    │
    ├── ObjectsAdminModal.jsx    (~420 rader) - Admin: alla objekt + synka hierarki
    ├── CategoryAdminModal.jsx   (~410 rader) - Admin: kategorier
    └── UsersAdminModal.jsx      (~350 rader) - Admin: användare ✅ NY
```

### Backup
- Branch `pre-split-backup` skapades Jan 29, 2026 innan refaktoriseringen
- Kan återställas med `git checkout pre-split-backup` vid behov

13. PRESTANDAÖVERVÄGANDEN (Framtida) 🔮

### Nuvarande implementation
- Alla objekt laddas via `onSnapshot` och filtreras client-side
- `getParentChain()` körs för varje objekt i displayObjects vid render
- Fungerar utmärkt för ~100-500 objekt

### Vid 500+ objekt - överväg:
1. **Pagination / "Visa fler"**
   - Visa 30 objekt först
   - Knapp för att visa fler
   - Nollställs vid filterändring
   - Enklast att implementera, inga nya dependencies

2. **Virtualisering (react-window)**
   - Renderar bara synliga kort i viewport
   - Kräver dependency: react-window
   - Bra för tusentals objekt

3. **Memoization av parentChain**
   ```javascript
   // Bygg objectsById lookup-map
   const objectsById = useMemo(() => 
     new Map(objects.map(o => [o.id, o])), [objects]);
   
   // Memoize parentChain per objekt
   const parentChains = useMemo(() => {
     const chains = new Map();
     objects.forEach(obj => {
       if (obj.parentId) {
         chains.set(obj.id, buildParentChain(obj, objectsById));
       }
     });
     return chains;
   }, [objects, objectsById]);
   ```

4. **Firestore index för parent/child**
   - INTE nödvändigt - vi gör client-side filtrering
   - Firestore-index hjälper bara server-side queries

### Beslut (Jan 30, 2026)
- **Avvakta** - nuvarande prestanda är bra
- Implementera optimeringar först när lagg uppstår
- YAGNI-principen: "You Aren't Gonna Need It"
- **ancestorIds** ger redan O(n) uppslagning för hierarki ✅

14. CHANGELOG v2.0 (Jan 30, 2026)

### Hierarki & Prestanda
- ✅ ancestorIds: Array av alla förfäders ID för snabb uppslagning
- ✅ Beräknas automatiskt vid skapa/redigera
- ✅ Uppdateras rekursivt vid förälderbyte
- ✅ Admin "Synka hierarki"-knapp för migration

### Delning
- ✅ Rekursiv delning: "Inkludera barn" delar alla ättlingar
- ✅ "inherited" status: ättlingar får ingen notifikation
- ✅ Nya barn ärver automatiskt förälderns shares

### Radering
- ✅ Kaskad-radering: tar bort alla ättlingar
- ✅ Varning visar antal objekt som raderas
- ✅ Endast owner/admin kan radera

### Användarhantering
- ✅ UsersAdminModal: Lista, sök, filtrera användare
- ✅ Blockera/avblockera användare
- ✅ Ge/ta admin-behörighet
- ✅ Blockerade får meddelande och loggas ut

### Bugfixar
- ✅ Extra location-blocks bevaras vid redigering
- ✅ Alla locations kopieras vid duplicering
- ✅ Kopiera-knapp bredvid "Lägg till barn"
- ✅ Rensa-knapp för text/checklista/todo-block
- ✅ Expanderande textarea (3→8 rader vid fokus)