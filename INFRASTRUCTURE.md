# OurSpots - Infrastruktur & Hosting

## Översikt

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   one.com   │────▶│  Cloudflare │────▶│   Firebase Hosting  │
│  (Domän)    │ NS  │    (DNS)    │  A  │      (Webbapp)      │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │Firestore │ │   Auth   │ │ Storage  │
                              │(Databas) │ │(Inlogg.) │ │ (Bilder) │
                              └──────────┘ └──────────┘ └──────────┘
```

### Tjänster som används:
| Tjänst | Vad det gör | Kostnad |
|--------|-------------|---------|
| **one.com** | Äger domänen ourspots.se | ~100 kr/år |
| **Cloudflare** | DNS-hantering, blockerar AI-botar | Gratis |
| **Firebase Hosting** | Serverar webbappen | Gratis |
| **Cloud Firestore** | NoSQL-databas för all data | Gratis |
| **Firebase Auth** | Google-inloggning | Gratis |
| **Firebase Storage** | Lagring av uppladdade bilder | Gratis |
| **Google Cloud** | API-nycklar och OAuth | Gratis |

---

## Aktiva URL:er

| URL | Beskrivning |
|-----|-------------|
| **https://ourspots.se** | ✅ Primär produktions-URL |
| https://ourspots-b536b.web.app | Firebase-URL (backup) |
| https://ourspots-b536b.firebaseapp.com | Firebase-URL (backup) |
| http://localhost:5173 | Lokal utveckling |

---

## 1. One.com (Domänregistrar)

### Vad det används till
- Äger domänen `ourspots.se`
- Pekar nameservers till Cloudflare (one.com hanterar INTE DNS)

### Inloggning
| | |
|-|-|
| **URL** | https://www.one.com/admin/ |
| **Konto** | *(ditt one.com-konto)* |

### Navigation
1. Logga in → **Domäner** → `ourspots.se`
2. **Nameservers** eller **DNS-inställningar**

### Nuvarande konfiguration
Nameservers pekar till Cloudflare:
```
jacob.ns.cloudflare.com
novalee.ns.cloudflare.com
```

### När du behöver gå hit
- ⏰ Förnya domänen (årligen)
- 🔄 Om du vill byta DNS-leverantör från Cloudflare

---

## 2. Cloudflare (DNS)

### Vad det används till
- Hanterar alla DNS-poster för ourspots.se
- Blockerar AI-träningsbotar
- (Valfritt) CDN och DDoS-skydd

### Inloggning
| | |
|-|-|
| **URL** | https://dash.cloudflare.com/ |
| **Konto** | *(ditt Cloudflare-konto)* |

### Navigation
1. Logga in
2. Klicka på **ourspots.se**
3. **DNS** → **Records** i vänstermenyn

### Nuvarande DNS-poster

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | ourspots.se | 199.36.158.100 | DNS only (grått moln) |
| TXT | ourspots.se | hosting-site=ourspots-b536b | - |
| CNAME | www | ourspots.se | DNS only (grått moln) |
| MX | ourspots.se | . | DNS only |

> ⚠️ **Viktigt:** A-posten MÅSTE ha "DNS only" (grått moln), inte "Proxied" (orange moln). Annars krockar SSL-certifikaten.

### När du behöver gå hit
- 🌐 Lägga till nya subdomäner
- 🔧 Felsöka DNS-problem
- 🛡️ Hantera säkerhetsinställningar

---

## 3. Firebase Console (Backend & Hosting)

### Vad det används till
- **Hosting:** Serverar webbappen på alla domäner
- **Firestore:** NoSQL-databas för spots, kategorier, användare
- **Authentication:** Google-inloggning
- **Storage:** Lagring av uppladdade bilder

### Inloggning
| | |
|-|-|
| **URL** | https://console.firebase.google.com/ |
| **Projekt** | ourspots-b536b |
| **Direktlänk** | https://console.firebase.google.com/project/ourspots-b536b/ |

### Navigation - Viktiga sidor

#### 🌐 Hosting (webbappen)
**Sökväg:** Firebase Console → Hosting

**Direktlänk:** https://console.firebase.google.com/project/ourspots-b536b/hosting

**Vad du kan göra här:**
- Se deployment-historik
- Rollback till tidigare version
- Hantera custom domains (ourspots.se)

---

#### 🗄️ Firestore Database
**Sökväg:** Firebase Console → Firestore Database

**Direktlänk:** https://console.firebase.google.com/project/ourspots-b536b/firestore

**Vad du kan göra här:**
- Se och redigera data direkt i webbgränssnittet
- Se användningsstatistik
- Hantera index (firestore.indexes.json)

---

#### 👥 Authentication (användare)
**Sökväg:** Firebase Console → Authentication

**Direktlänk:** https://console.firebase.google.com/project/ourspots-b536b/authentication

**Vad du kan göra här:**
- Se alla registrerade användare
- Inaktivera/ta bort användare
- Hantera inloggningsmetoder

**Viktigt - Authorized domains:**
`Authentication → Settings → Authorized domains`

Dessa domäner är konfigurerade:
- ✅ localhost
- ✅ ourspots-b536b.firebaseapp.com
- ✅ ourspots-b536b.web.app
- ✅ ourspots.se

> ⚠️ Om du lägger till en ny domän måste den läggas till här för att Google-inloggning ska fungera.

---

#### 📁 Storage (bilder)
**Sökväg:** Firebase Console → Storage

**Direktlänk:** https://console.firebase.google.com/project/ourspots-b536b/storage

**Vad du kan göra här:**
- Se uppladdade filer
- Ta bort filer manuellt
- Se lagringsutrymme

---

## 4. Google Cloud Console (API & OAuth)

### Vad det används till
- **API-nycklar:** Begränsar vilka webbplatser som får anropa Firebase
- **OAuth 2.0:** Konfigurerar Google-inloggningen

### Inloggning
| | |
|-|-|
| **URL** | https://console.cloud.google.com/ |
| **Projekt** | ourspots-b536b |
| **Credentials** | https://console.cloud.google.com/apis/credentials?project=ourspots-b536b |

### Navigation

#### 🔑 API Keys (Website restrictions)
**Sökväg:** Google Cloud Console → APIs & Services → Credentials → API Keys → Browser key

**Vad det gör:** Begränsar vilka webbplatser som får använda din Firebase API-nyckel.

**Nuvarande konfiguration (Website restrictions):**
```
http://localhost
localhost:*
https://ourspots.se/*
https://ourspots-b536b.web.app/*
https://ourspots-b536b.firebaseapp.com/*
https://gilljams.github.io/*
```

> ⚠️ Om du lägger till en ny domän måste den läggas till här, annars får du "API_KEY_HTTP_REFERRER_BLOCKED"-fel.

---

#### 🔐 OAuth 2.0 Client (Redirect URIs)
**Sökväg:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Web client

**Vad det gör:** Definierar vart Google får skicka tillbaka användaren efter inloggning.

**Nuvarande konfiguration (Authorized redirect URIs):**
```
https://ourspots-b536b.firebaseapp.com/__/auth/handler
https://ourspots-b536b.web.app/__/auth/handler
https://ourspots.se/__/auth/handler
```

> ⚠️ Om du lägger till en ny domän måste du lägga till `https://dindomän/__/auth/handler` här, annars får du "redirect_uri_mismatch"-fel.

---

## 5. Lokal utveckling

### Projektstruktur
```
ourspots/
├── src/                    # Källkod (React + Vite)
│   ├── components/         # React-komponenter
│   ├── utils/              # Hjälpfunktioner
│   ├── firebase.js         # Firebase-konfiguration
│   ├── App.jsx             # Huvudkomponent
│   ├── main.jsx            # Entry point
│   └── index.css           # Globala stilar
├── public/                 # Statiska filer
├── dist/                   # Byggd app (genereras av npm run build)
├── firebase.json           # Firebase Hosting-konfiguration
├── firestore.rules         # Databas-säkerhetsregler
├── firestore.indexes.json  # Firestore-index
├── vite.config.js          # Vite build-konfiguration
├── tailwind.config.js      # Tailwind CSS-konfiguration
├── package.json            # Projektberoenden
└── INFRASTRUCTURE.md       # Denna fil
```

### Firebase-konfiguration (src/firebase.js)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBe5bAF1CtXWftWA8biN7Tcd0Ms4cGWGvI",
  authDomain: "ourspots.se",  // ← Custom domain för inloggning
  projectId: "ourspots-b536b",
  storageBucket: "ourspots-b536b.firebasestorage.app",
  messagingSenderId: "1047808506108",
  appId: "1:1047808506108:web:c418b70d0f27f2b679ff79"
};
```

---

## 6. Bygga & Deploya

### Dagligt arbetsflöde

#### 1. Starta lokal utvecklingsserver
```bash
npm run dev
```
Öppnar appen på http://localhost:5173 med hot reload.

#### 2. Testa ändringar lokalt
Gör dina ändringar, se att allt fungerar i webbläsaren.

#### 3. Bygga och deploya till produktion
```bash
npm run build
firebase deploy --only hosting
```

Det var allt! Efter ~30 sekunder är ändringarna live på https://ourspots.se

---

### Alla tillgängliga kommandon

| Kommando | Vad det gör |
|----------|-------------|
| `npm run dev` | Startar lokal utvecklingsserver |
| `npm run build` | Bygger appen för produktion (till dist/) |
| `npm run preview` | Förhandsvisar byggd version lokalt |
| `firebase deploy` | Deployar allt (hosting + rules + indexes) |
| `firebase deploy --only hosting` | Deployar endast webbappen |
| `firebase deploy --only firestore:rules` | Deployar endast databasregler |
| `firebase deploy --only firestore:indexes` | Deployar endast index |

---

### Vanliga deploy-scenarier

#### Endast kodändringar (vanligast)
```bash
npm run build
firebase deploy --only hosting
```

#### Ändrat databasregler (firestore.rules)
```bash
firebase deploy --only firestore:rules
```

#### Lagt till nytt index (firestore.indexes.json)
```bash
firebase deploy --only firestore:indexes
```

#### Deploya allt
```bash
npm run build
firebase deploy
```

---

## 7. Lägga till ny domän (checklista)

Om du i framtiden vill lägga till en ny domän (t.ex. `app.ourspots.se`):

### Steg 1: Cloudflare DNS
- Lägg till A-post eller CNAME som pekar till Firebase

### Steg 2: Firebase Hosting
- Firebase Console → Hosting → Add custom domain

### Steg 3: Firebase Auth
- Firebase Console → Authentication → Settings → Authorized domains
- Lägg till nya domänen

### Steg 4: Google Cloud - API Key
- Google Cloud Console → Credentials → API Keys → Browser key
- Lägg till `https://nydomän/*` under Website restrictions

### Steg 5: Google Cloud - OAuth
- Google Cloud Console → Credentials → OAuth 2.0 Client IDs
- Lägg till `https://nydomän/__/auth/handler` under Authorized redirect URIs

### Steg 6: (Valfritt) Uppdatera authDomain
Om nya domänen ska vara primär, ändra i `src/firebase.js`:
```javascript
authDomain: "nydomän.se",
```
Och deploya igen.

---

## 8. Felsökning

### "Requests from referer are blocked"
**Problem:** API-nyckeln tillåter inte domänen.

**Lösning:**
1. Google Cloud Console → Credentials → API Keys
2. Lägg till domänen under Website restrictions: `https://dindomän/*`
3. Vänta några minuter

---

### "redirect_uri_mismatch" vid inloggning
**Problem:** OAuth-klienten tillåter inte redirect från domänen.

**Lösning:**
1. Google Cloud Console → Credentials → OAuth 2.0 Client IDs
2. Lägg till: `https://dindomän/__/auth/handler`
3. Vänta några minuter

---

### Google-inloggning fungerar inte
**Checklista:**
1. ✅ Domänen finns i Firebase Auth → Authorized domains?
2. ✅ Domänen finns i API Key → Website restrictions?
3. ✅ Redirect URI finns i OAuth Client?
4. ✅ `authDomain` i firebase.js pekar på rätt domän?

---

### Domänen visar fel sida / 404
**Checklista:**
1. Kolla DNS-propagering: https://dnschecker.org/#A/ourspots.se
2. Ska visa: `199.36.158.100`
3. Kolla Firebase Hosting → Custom domains → Status ska vara "Connected"

---

### SSL-certifikat varning
**Problem:** "Din anslutning är inte privat"

**Lösning:**
- Firebase skapar SSL automatiskt, kan ta upp till 24h
- Kontrollera att Cloudflare proxy är **DNS only** (grått moln), inte Proxied

---

## 9. Kostnader

### Nuvarande (allt gratis)
| Tjänst | Plan | Kostnad |
|--------|------|---------|
| one.com | Endast domän | ~100 kr/år |
| Cloudflare | Free | 0 kr |
| Firebase | Spark (free) | 0 kr |
| Google Cloud | Free tier | 0 kr |

### Firebase Free Tier-gränser
| Resurs | Gräns |
|--------|-------|
| Hosting lagring | 10 GB |
| Hosting överföring | 360 MB/dag |
| Firestore lagring | 1 GB |
| Firestore läsningar | 50 000/dag |
| Firestore skrivningar | 20 000/dag |
| Storage lagring | 5 GB |
| Storage nedladdning | 1 GB/dag |
| Authentication | Obegränsat |

> 💡 Dessa gränser räcker gott för en mindre app. Du får varning i Firebase Console om du närmar dig gränserna.

---

## 10. Snabblänkar

| Vad | Länk |
|-----|------|
| **Appen (produktion)** | https://ourspots.se |
| **Firebase Console** | https://console.firebase.google.com/project/ourspots-b536b/ |
| **Firebase Hosting** | https://console.firebase.google.com/project/ourspots-b536b/hosting |
| **Firestore Database** | https://console.firebase.google.com/project/ourspots-b536b/firestore |
| **Firebase Auth** | https://console.firebase.google.com/project/ourspots-b536b/authentication |
| **Firebase Storage** | https://console.firebase.google.com/project/ourspots-b536b/storage |
| **Cloudflare Dashboard** | https://dash.cloudflare.com/ |
| **Google Cloud Credentials** | https://console.cloud.google.com/apis/credentials?project=ourspots-b536b |
| **One.com Admin** | https://www.one.com/admin/ |
| **DNS Checker** | https://dnschecker.org/#A/ourspots.se |

---

*Senast uppdaterad: 3 februari 2026*
