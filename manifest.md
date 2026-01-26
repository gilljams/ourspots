========================
OurSpots – Manifest / Blueprint (Updated Jan 2026)
========================

🚀 STATUS: v0.9 - Favoriter & Admin-verktyg

1. VISION
- Mobilfokuserad app med premium dark theme
- Hanterar fastigheter, smultronstellen/kaféer, resor/projekt
- Delade objekt (viewer/editor) - planerad funktion
- Objekt + block = återanvändbar struktur ✅
- Hierarki för objekt (parent → child) ✅
- Favoriter med stjärn-ikon och filterkategori ✅
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

2. KATEGORI-SYSTEM
- Dynamiska kategorier lagrade i Firebase ✅
- Admin kan skapa, redigera, radera kategorier ✅
- 22+ valbara ikoner från Lucide React ✅
- Anpassad färg per kategori ✅
- Sorterbar ordning (upp/ner pilar) ✅
- Automatisk hantering av objekt vid kategori-radering ✅

Tillgängliga ikoner:
- Bas: Home, Coffee, Mountain, Star, MapPin, Calendar, Folder, Navigation
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
- sharedWith?: { userId: string, role: "viewer" | "editor" }[]
- public?: boolean
- systemblock: createdAt, updatedAt, Objekt-ID, ParentID, LayerID

Block:
- type: "image", url
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
- PWA-implementation (manifest.json, service worker, installbar)
- Fler blocktyper (betyg, öppettider, kontakt, länkar)
- Delning/roller (viewer/editor) – planerad
- Lager/samlingar för resor och projekt
- Användarhantering (se dina objekt, profil)

8. DELADE OBJEKT / SHARED OBJECTS (PLANERAD FUNKTION)
- Owner kan dela objekt med roll: Viewer / Editor
- Delning ärvs nedåt i hierarki (valfritt override)
- Endast synligt för användare med access
- Marker visas på karta för delade användare

9. ADMINISTRATIVA FUNKTIONER ✅ IMPLEMENTERAT

### Kategorihantering (Implementerat)
- ✅ Skapa nya kategorier med namn, ikon, färg
- ✅ Redigera befintliga kategorier
- ✅ Radera kategorier med automatisk objekthantering
- ✅ Ordna kategorier (flytta upp/ner)
- ✅ Visa antal objekt per kategori
- ✅ Dark mode-optimerad UI
- ✅ Real-time synkronisering med Firebase

### Objekthantering (Implementerat)
- ✅ Admin kan redigera alla objekt oavsett ägare
- ✅ Admin kan radera alla objekt oavsett ägare
- ✅ Hantera ägarlösa objekt (skapade innan användarsystem)
- ✅ Firebase Security Rules uppdaterade för admin-behörighet

### Användarhantering (Implementerat)
- ✅ Favoriter: Markera objekt med stjärn-ikon
- ✅ Favoritkategori: Filtrering på favoritmarkerade objekt
- ✅ Persistent lagring i Firestore users/{uid}/favorites

### Inställningar (Implementerat)
- ✅ "Håll skärmen påslagen" med Wake Lock API
- ✅ Persistent inställning i localStorage
- ✅ Automatisk hantering vid visibility changes

### Admin-åtkomst (Implementerat)
- ✅ isAdmin-flagga i users collection
- ✅ Admin-sektion synlig endast för administratörer
- ✅ Skydd mot obehörig åtkomst

### Planerade admin-funktioner
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
- Frontend: React + Vite, host GitHub Pages
- Databas: Firebase Firestore
- Authentication: Firebase Auth
- Bilduppladdning: Cloudinary (25GB/månad gratis, unsigned uploads)
- CI/CD: GitHub Actions
- PWA möjlig för offline / haptics
- Design: dark theme, glassmorphism, accentfärger per kategori/typ

10. MVP / FEATURE-ÖVERSIKT
- Objekt + block
- Hierarki (parent → child)
- Kategorier som swipe
- Lager (samlingar, resor, public layer)
- Delning (viewer/editor)
- Filter (avstånd / typ / favorit)
- Kartintegration med marker och glow för nära objekt
- Floating add button
- Breadcrumbs
- Dark theme + glassmorphism
- Publik vy med karta och kort för externa användare
- Adminfunktioner (kategorier, lager, objekt, block, delning)
- Fördefinierade typ-ikoner
- Modulära block/förmågor + default sets per kategori/typ