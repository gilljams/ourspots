========================
OurSpots – Manifest / Blueprint (Updated Feb 10, 2026)
========================

🚀 STATUS: v2.9.5 - Demo/Help Objects Feature

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
- Demo-objekt för hjälp och dokumentation (admin-skapade, skrivskyddade) ✅ NY v2.9.5
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
- Ny ListEditorModal för enkla listor med drag & drop, Enter=ny rad, paste-funktion ✅ NY v2.9.2
- Separerade Lista-modal (enkel) och Tabell-modal (avancerad) ✅ NY v2.9.2
- Redigera-pennikon visas endast när block är expanderat ✅ NY v2.9.2
- Tomma text/lista-block sparas som skelett för senare redigering ✅ NY v2.9.2
- Grupperade blocktyper med "Fler"-knapp ✅ NY v2.3
- Poll-block för gruppomröstningar (datum/helger) ✅ NY v2.4
- Display name / nickname i profilinställningar ✅ NY v2.4
- Senaste kontakter för snabbare delning ✅ NY v2.4
- iOS Safari viewport fix (ghost clicks) ✅ NY v2.4
- Konsoliderat checklistor och todos till tabellblock ✅ NY v2.5
- "Ihopfälld som standard" toggle för text-block ✅ NY v2.5
- Längre texter i tabellblock (full text-wrapping) ✅ NY v2.5
- Enter-tangent för snabb inmatning i tabeller ✅ NY v2.5
- Collapsible burger-meny med sektioner (Admin/Inställningar/Snabbfånga) ✅ NY v2.5
- Ranked poll: 🥇🥈🥉 röstning med poängsystem (3p/2p/1p) ✅ NY v2.6
- Poll med klickbara länkar (t.ex. restaurang-URLar) ✅ NY v2.6
- Avsluta omröstning med sorterad resultatvy ✅ NY v2.6
- Tiebreaker: vid lika poäng vinner flest guld > silver > brons ✅ NY v2.6
- Enter-navigering i poll-editor (som tabeller) ✅ NY v2.6
- Användargodkännande-system med objektgränser ✅ NY v2.7
- Nya användare begränsas till 5 objekt (konfigurerbart) ✅ NY v2.7
- Admin kan godkänna användare för utökad gräns (100 objekt) ✅ NY v2.7
- Inställningspanel i användarhantering för admin ✅ NY v2.7
- "Väntar"-filter för att se ogodkända användare ✅ NY v2.7
- Delade objekt räknas inte mot användarens gräns ✅ NY v2.7
- Audio-block för ljudfiler (admin-only, via GitHub Pages /media/) ✅ NY v2.8
- Diskret ljudspelning vid platsblock (play-knapp med puls-animation) ✅ NY v2.8
- Full ljudspelare för icke-diskret läge ✅ NY v2.8
- Poll-förslag: viewers kan lägga till egna alternativ ✅ NY v2.8
- Ta bort egna förslag i polls (säker radering) ✅ NY v2.8
- "Föreslå"-knapp i poll-footer (kompakt UI) ✅ NY v2.8
- Datumnedräkning på kort (badge) och i datumblock ✅ NY v2.8
- Smart datumformattering (samma dag visas utan intervall) ✅ NY v2.8
- Grid/list toggle visas vid 1+ barn (tidigare 2+) ✅ NY v2.8
- "Lägg till barn"-knapptext (tydligare) ✅ NY v2.8
- Dold extern-länk-ikon för enstaka länkar ✅ NY v2.8
- Inherited shares auto-accepted (kan rösta direkt) ✅ NY v2.8.1
- "Acceptera delningen för att rösta" meddelande för pending shares ✅ NY v2.8.1
- Synka hierarki fixar även ärvda delningar (acceptedShareEmails) ✅ NY v2.8.1
- Nya barn under delade objekt får korrekt acceptedShareEmails ✅ NY v2.8.1
- URL-fält för ranked poll förslag (valfritt) ✅ NY v2.8.1
- Karta synkad med listfilter (displayObjects) ✅ NY v2.8.1
- SVG Music-ikon i AudioBlockEditor ✅ NY v2.8.1
- Splitt-block för utgiftsdelning (resor, projekt) ✅ NY v2.9
  - Förenklad modell: ett belopp per deltagare (ej separata utgifter) ✅ UPPDATERAD v2.9.1
  - Individ-modell: klickbara badges för att välja deltagare ✅ UPPDATERAD v2.9.1
  - Familj-modell: viktad delning (vuxna×1, barn×0.5) med Enter-navigering ✅
  - Ägare kan delta i splitt (inte bara delade användare) ✅ NY v2.9.1
  - Collapsible header i visningsläge (som andra block) ✅ NY v2.9.1
  - Kompakt inmatningsfält med "Jag har lagt ut:" label ✅ NY v2.9.1
  - "Du får tillbaka X kr" / "Du är skyldig X kr" statustext ✅ NY v2.9.1
  - Öppna igen / Nollställ belopp knappar i redigering ✅ NY v2.9.1
  - Avsluta split visar swisha-förslag (minimerar transaktioner) ✅
  - Grön Wallet-ikon och färgschema ✅
  - Ihopfälld som standard (defaultCollapsed) ✅
- Firebase Hosting deployment (alternativ till GitHub Pages) ✅ NY v2.9.1
- GitHub Actions workflow för automatisk deploy ✅ NY v2.9.1
- API-nyckel säkerhetsrestriktioner (website + API) ✅ NY v2.9.1

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
- type: "text", content, defaultCollapsed (stöder markdown: **bold**, *italic*, [länkar](url), > citat, # rubriker) ✅ UPPDATERAD v2.5
- type: "text" fullscreen editor på mobil med iOS-optimerad tangentbordshantering ✅ NY v2.3
- ~~type: "checklist", items[]~~ (BORTTAGEN v2.5 - migrerat till table)
- ~~type: "todo", items[]~~ (BORTTAGEN v2.5 - migrerat till table)
- type: "links", title, items[{title, url, icon}] ✅
- type: "table", title, template, columns[], rows[], defaultCollapsed ✅ UPPDATERAD v2.5
- type: "datetag", tags[{type: "year"|"range", year?, startDate?, endDate?}] ✅
- type: "contact", phone, email, website ✅ NY
- type: "timer", timers[{label, duration}] (med iOS-ljud och compact view) ✅ NY
- type: "poll", title, pollType ("date"|"ranked"), options[{id, label, url?, addedBy?}], votes{emailKey: {displayName, votes: {optionId: "yes"|"no"|"maybe" | 1|2|3}}}, closed?, allowSuggestions? ✅ UPPDATERAD v2.8
- type: "audio", title, url, discrete? (diskret = play vid plats, annars full spelare) ✅ NY v2.8
- type: "split", title, model ("individual"|"family"), participants[{email, name, weight, adults?, children?}], expenses[{id, amount, description?, paidBy, addedBy, addedAt}], closed?, defaultCollapsed? ✅ NY v2.9
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
- displayName?: string (nickname för profil och polls) ✅ NY v2.4
- isAdmin: boolean
- blocked?: boolean ✅ NY
- blockedAt?: Timestamp ✅ NY
- approved?: boolean (godkänd för utökad objektgräns) ✅ NY v2.7
- approvedAt?: Timestamp ✅ NY v2.7
- favorites: string[] (array av objekt-ID:n)
- sharedContacts?: string[] (senast delade med, för snabb delning) ✅ NY v2.4
- createdAt: Timestamp
- updatedAt?: Timestamp

Settings: ✅ NY v2.7
- settings/app document med globala inställningar
- defaultObjectLimit: number (standard: 5, för nya användare)
- approvedObjectLimit: number (standard: 100, för godkända användare)
- Admin kan konfigurera via Inställningar-panel i användarhantering

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
- Sökning på namn och innehåll (text/tabeller) ✅ UPPDATERAD v2.5
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
- ✅ Block-rendering i PublicObjectView fungerar
- ✅ Hämta objekt delade MED användaren (shares query)
- ✅ Firestore Security Rules implementerat
- ✅ Badges på objektkort för delad status
- ✅ Delad ekonomi / Split-block (implementerat v2.9)

### ROADMAP / TODO

#### Demo/Hjälp-objekt ✅ IMPLEMENTERAT v2.9.4
Mål: Admin kan skapa exempelobjekt som visar dokumentation och funktionsdemos.
- ✅ Admin skapar objekt i demo-läge → blir automatiskt demo-objekt
- ✅ Demo-objekt filtreras bort i normalt läge (syns inte för någon)
- ✅ Firestore-regler tillåter läsning för alla inloggade: `allow read: if resource.data.isDemo == true`
- ✅ Toggle i inställningar "Visa demoexempel" (sparas i localStorage)
- ✅ Kräver inloggning (ingen anonym åtkomst)
- ✅ Demo-objekt visas med lila "Demo"-badge
- ✅ Demo-läge = hård filtrering (visar ENDAST demo-objekt)
- ✅ Lila banner i demo-läge med snabb avsluta-knapp
- ✅ **Interaktiv demo**: Icke-admins deltar som "Anna" i demo-objekt
  - Kan rösta i polls
  - Kan lägga in belopp i splits (om Anna är deltagare)
  - Kan föreslå alternativ i polls
- ✅ Demo-användare i block-editorn: Anna, Erik, Lisa, Johan, Maria
- ✅ Admin ser "(admin-läge)" i bannern, användare ser "du deltar som Anna"

#### Framtida idéer
- **Minigalleri** - Upp till 4 bilder per objekt i lägre upplösning, swipe/carousel-vy
- **Omstrukturera "Lägg till block"** - Gruppera block-typer logiskt (Text & Anteckningar | Listor & Tabeller | Interaktiva | Media & Kontakt)
- **"Min plats" / Parking Pin** - En personlig pin per användare som kan snabbsparas (överskrives vid ny). Perfekt för parkeringskoordinater med anteckning ("Plan 3") eller återsamlingsplats. Sparas i userDoc, visas på kartan med särskilt märke, navigeringslänk till Google Maps

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

### Poll Block (Implementerat v2.4) ✅ NY
- ✅ Omröstning för grupper (t.ex. "vilken helg passar?")
- ✅ Alternativ med label (t.ex. "14-16 mars", "21-23 mars")
- ✅ Tre rösttyper: Ja (grön), Nej (röd), Kanske (gul)
- ✅ Toggle-röstning (klicka igen för att ta bort röst)
- ✅ Automatisk ranking med poängsystem (yes=10, maybe=1, no=-5)
- ✅ Trophy-ikon för bästa alternativ
- ✅ Delad förstaplats: alla vinnare får tonad pokal
- ✅ Kompakt vy (default) med expanderbar detaljerad vy
- ✅ Visar vem som röstat vad i detaljerad vy
- ✅ Nickname/displayName visas istället för email
- ✅ Collapsible block med ChevronDown
- ✅ Nollställ röster-knapp i editor (med bekräftelse)
- ✅ Röster nollställs automatiskt vid objektduplicering

### Display Name & Sharing UX (Implementerat v2.4) ✅ NY
- ✅ Nickname/display name i profilinställningar (kugghjulet i menyn)
- ✅ Sparas i Firebase users-collection
- ✅ Visas i Poll-röster istället för email-prefix
- ✅ Senaste kontakter: sparar email vid delning
- ✅ Snabbval-chips i ShareModal för att dela igen
- ✅ Max 10 senaste kontakter sparas

### iOS Safari Viewport Fix (Implementerat v2.4) ✅ NY
- ✅ Fixar "ghost clicks" efter iOS zoom på inputfält
- ✅ focusout-listener som återställer viewport
- ✅ 100ms delay för att låta Safari stabilisera sig

### Block Consolidation (Implementerat v2.5) ✅ NY
- ✅ Checklist och Todo block migrerade till Table block
- ✅ Checklist → Table med template "list"
- ✅ Todo → Table med template "tasks"
- ✅ Migrationsfunktion i Admin-menyn (nu borttagen)
- ✅ Gammla ChecklistBlock och TodoBlock komponenter borttagna
- ✅ ~130 rader kod borttagen, bundle ~4KB mindre

### Table Block Improvements (Implementerat v2.5) ✅ NY
- ✅ "Ihopfälld som standard" toggle för alla tabelltyper
- ✅ Full text-wrapping för långa texter (perfekt för recept)
- ✅ Checkbox justerad till toppen vid flerradig text
- ✅ Enter-tangent lägger till ny rad (lista-typ)
- ✅ Enter navigerar genom kolumner → ny rad (flerkolomn-typer)
- ✅ Tips-text uppdaterad: "Enter = ny rad • Ctrl+V = klistra in flera"

### Text Block Improvements (Implementerat v2.5) ✅ NY
- ✅ "Ihopfälld som standard" toggle i editorn
- ✅ defaultCollapsed sparas på block-data
- ✅ ObjectDetail respekterar defaultCollapsed vid öppning
- ✅ Ikon uppdaterad till blå (text-blue-400)

### Collapsible Menu (Implementerat v2.5) ✅ NY
- ✅ Burger-meny med tre sektioner: ADMIN, INSTÄLLNINGAR, SNABBFÅNGA
- ✅ Varje sektion har ChevronDown och collapse/expand
- ✅ localStorage-persistens för varje sektions state
- ✅ Admin-sektionen endast synlig för administratörer

### CreateObjectModal UX (Förbättrad v2.5) ✅ NY
- ✅ "Använd samma plats" checkbox flyttad före Grundinställningar
- ✅ Grundinställningar-sektion är collapsible
- ✅ "Att göra"-knappen borttagen (ersatt av Tabell med tasks-template)

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