========================
OurSpots – Komplett Manifest / Blueprint
========================

1. VISION
- Mobilfokuserad app med premium dark theme
- Hanterar fastigheter, smultronställen/kaféer, resor/projekt
- Delade objekt (viewer/editor)
- Objekt + block = återanvändbar struktur
- Hierarki för objekt (parent → child)
- Lager/samlingar för resor/projekt
- Kategorier = vy-filter
- Kartintegration med position och avstånd
- Dark theme + glassmorphism + accentfärger
- Publik vy för gäster eller externa användare
- Modulära block/förmågor: nya block kan implementeras utan att ändra objektmodell
- Default block set per typ/kategori för enkelhet
- Namn: OurSpots – signalerar familjär, delad och personlig platsbok

2. FÖRDEFINIERADE TYP-IKONER
| Typ / Objekt        | Ikon |
|--------------------|------|
| Fastighet          | 🏡   |
| Hus                | 🏠   |
| Garage             | 🚗   |
| Baksida / Trädgård | 🌳   |
| Bär / Smultronställe | 🍓 |
| Svamp              | 🍄   |
| Kafé / Restaurang  | ☕   |
| Resa / Trip        | ✈️   |
| Natur / Utflykt    | 🏞️   |
| Favorit            | ⭐   |
- Ikoner används konsekvent i kort, karta, filter, chip
- Admin kan endast välja bland dessa

3. ARKITEKTUR / DATAMODELL
Object:
- id: string
- parentId?: string
- layerId: string
- type: typ från fördefinierade ikoner
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

Layer:
- id: string
- name: string
- type: "default" | "trip" | "project" | "public"
- color?: string
- icon?: string

Category:
- id: string
- name: string
- filter: (object) => boolean
- icon: string
- accentColor: string
- swipebar: boolean

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
- Filter på: avstånd, typ, endast favoriter
- Lager + kategori styr vy
- Real-time uppdatering av lista och karta
- Position-block kan: öppna karta, visa avstånd
- Publik vy: markerar public=true objekt

6. KARTFUNKTION / POSITION
- Visa alla objekt med position på kartan
- Dina egna tips highlightas när du är i närheten
- Barnobjekt kan ha egen position
- Tap på marker → öppnar detaljvy
- Zoom → visa fler barnobjekt / klustring
- Tryck & håll → skapa nytt objekt på platsen
- Filter + lager switch uppdaterar karta i realtid
- Premium dark map style + glow på marker nära användaren

7. DELADE OBJEKT / SHARED OBJECTS
- Owner kan dela objekt med roll: Viewer / Editor
- Delning ärvs nedåt i hierarki (valfritt override)
- Endast synligt för användare med access
- Marker visas på karta för delade användare

8. ADMINISTRATIVA FUNKTIONER
- Kategorier: lägg till, redigera, ta bort, sätt swipebar, ikon, färg, filter
- Lager: lägg till, redigera, ta bort, färg, ikon, typ
- Objekt: flytta mellan lager, flytta i hierarki, redigera metadata, public flag
- Delning / access: lägg till / ta bort användare, set roll Viewer/Editor
- Block: lägg till / editera / ta bort block, ändra ordning (drag & drop)
- Filter & defaultvy: bestäm standardfilter per kategori/lager
- Preview: se hur det ser ut på mobil (privat / publik vy)
- Versionshistorik / undo (om möjligt)
- Import / export av objekt (valfritt)

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