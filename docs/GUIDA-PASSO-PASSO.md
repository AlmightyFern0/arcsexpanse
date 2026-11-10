# Guida passo passo — sito Expanse

> Cose da fare dopo le correzioni di accessibilità e sicurezza (novembre 2026).
> Segui i passi in ordine e spunta le caselle `[x]` man mano.
> Dove trovi 🧑‍💻 serve qualcuno che conosca il codice: puoi chiedere a Claude.
> La versione tecnica di tutto questo è in `SECURITY-HOSTING-HANDOFF.md`.

---

## Passo 1 — Guarda le modifiche sul tuo computer

Prima di pubblicare, controlla che tutto funzioni come ti aspetti.

- [ ] Apri il Terminale nella cartella del progetto e scrivi `npm run dev`
- [ ] Apri il browser su **http://localhost:3000**
- [ ] Verifica con la sola tastiera (niente mouse):
  - [ ] Premi **Tab** una volta: in alto a sinistra compare un riquadro ciano **"Vai a: Skill · Progetti · …"**. Scegli una voce con Tab e premi **Invio**: la pagina salta a quella sezione.
  - [ ] Continua a premere Tab: ogni elemento selezionato ha un **contorno bianco** ben visibile.
  - [ ] Arriva al pulsante del menu e premi **Invio**: il menu si apre. Premi **Esc**: si chiude.
- [ ] Apri una scheda progetto **chiara** (es. *La Cimbali Technology Video Pills*): i testi si leggono bene? La luce colorata ora è un po' più tenue, è voluto.
- [ ] Sul telefono (o restringendo la finestra): nella home, titolo e categoria dei progetti sono sempre visibili sopra le immagini.
- [ ] Pagina **Contattaci**: prova a inviare senza scegliere categoria o tag. Deve comparire un messaggio che chiede di sceglierli.

Se qualcosa non ti convince, annotalo e chiedi una modifica prima di andare avanti.

---

## Passo 2 — Pubblica le modifiche 🧑‍💻

Le correzioni stanno in un ramo separato del progetto, `fix/audit-wcag-sicurezza`, e non sono ancora online.

- [ ] Chiedi di **unire il ramo a `main` e pubblicarlo**. Vercel mette online il sito da solo dopo il push.
- [ ] Quando è online, apri **www.arcs-expanse.com** e ripeti velocemente i controlli del Passo 1.

---

## Passo 3 — Cambia tre indirizzi dei progetti in Sanity

Alcuni progetti hanno un indirizzo web (lo "slug") diverso dal loro titolo. Il sito è già pronto: i vecchi indirizzi porteranno da soli ai nuovi, quindi nessun link si rompe.

**Come si fa (per ognuno dei tre):**
1. Vai su **www.arcs-expanse.com/studio** ed entra.
2. Apri il progetto dall'elenco.
3. Trova il campo **Slug**, cancella il testo e scrivi quello nuovo, esattamente come sotto.
4. Premi **Publish** (in basso a destra).

| Progetto | Slug attuale | Scrivi questo |
|---|---|---|
| Rome's Immersive Library | `rome's-immersive-library` | `romes-immersive-library` |
| Nutella Croissant Shopper journey | `nutella-croissant-shopper-journey-strategy` | `nutella-croissant-shopper-journey` |
| Concept Campari Virtual Experience | `campari-virtual-experience` | `concept-campari-virtual-experience` |

- [ ] Rome's fatto
- [ ] Nutella fatto
- [ ] Campari fatto
- [ ] Controllo: apri il vecchio indirizzo, ad esempio `www.arcs-expanse.com/projects/campari-virtual-experience`. Deve aprirsi la scheda, con il nuovo indirizzo nella barra del browser.

---

## Passo 4 — Correggi i testi in Sanity

Sempre nello Studio, apri il progetto, correggi e premi **Publish**.

- [ ] Progetto **"CONCEPT CASADIO VIRTUAL EXPERIENCE"**: il progetto giusto è **Cimbali**. Correggi titolo e descrizione. Lo slug resta com'è.
- [ ] **"VIDEO INTERFACCIA P333"**: nella descrizione, "LaCimbali" → "La Cimbali"
- [ ] Cerca e correggi nelle descrizioni: **"Un idea"** → "Un'idea" e **"spazio.Il"** → "spazio. Il"
- [ ] **"APPLAYDU  HOLOGRAM"**: nel titolo ci sono due spazi tra le parole, lasciane uno solo
- [ ] **"RAIN DIGITAL TWIN"**: nel campo **"Categorie filtro"** la categoria **"Digital Twin"** compare due volte. Rimuovine una: passa il mouse sulla riga, apri il menu **⋯** a destra → **Remove**. Poi premi **Publish**.
  Lo Studio ora non accetta categorie ripetute: finché il doppione resta, su questo progetto vedrai un avviso rosso e non potrai pubblicare altre modifiche. Il sito invece funziona già correttamente.

---

## Passo 5 — Descrivi le immagini dei progetti (accessibilità)

Chi non vede le immagini, ad esempio chi usa un lettore di schermo, sente il testo che scrivi qui. Nello Studio, in ogni progetto, ogni immagine della lista **"Lista Immagini Dettaglio Progetto"** ha ora un campo **"Testo alternativo"**.

- [ ] Per ogni immagine scrivi una frase breve su **cosa si vede**, ad esempio *"Rendering dello stand Campari con bancone rosso e insegna luminosa"*.
- [ ] Se un'immagine è solo decorativa e non aggiunge informazioni, lascia il campo vuoto.
- [ ] Non serve iniziare con "Immagine di…".

Puoi farlo un po' alla volta: il sito funziona anche con i campi vuoti.

---

## Passo 6 — Sistema il dominio su Vercel

Oggi il sito risponde sia con `www.` sia senza. Serve un indirizzo unico, che è meglio per Google.

1. Vai su **vercel.com** → progetto del sito → **Settings → Domains**.
2. Trova `arcs-expanse.com` (senza www) → **Edit** → scegli **Redirect to** `www.arcs-expanse.com` con **301**.
3. Salva.

- [ ] Fatto
- [ ] Controllo: apri `arcs-expanse.com` e verifica che il browser passi a `www.arcs-expanse.com`.

---

## Passo 7 — Attiva il controllo anti-spam (Cloudflare Turnstile)

Il form ha già diverse protezioni. Questo passo aggiunge un controllo "non sono un robot" che di solito è **invisibile** per chi compila. Il sito è già predisposto: servono solo due chiavi.

1. Crea un account gratuito su **dash.cloudflare.com**.
2. Nel menu a sinistra apri **Turnstile → Add widget**.
   - Nome: `Expanse form`
   - Dominio: `www.arcs-expanse.com` (aggiungi anche `arcs-expanse.com`)
   - Modalità: **Managed**
3. Cloudflare ti mostra due chiavi: **Site Key** e **Secret Key**.
4. Su **vercel.com** → progetto → **Settings → Environment Variables** aggiungi:

   | Nome (copialo esatto) | Valore |
   |---|---|
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | la **Site Key** |
   | `TURNSTILE_SECRET_KEY` | la **Secret Key** |

5. In Vercel → **Deployments** → sull'ultimo deploy premi **⋯ → Redeploy**.

- [ ] Chiavi create
- [ ] Chiavi inserite su Vercel (**servono tutte e due**: con una sola il controllo resta spento)
- [ ] Redeploy fatto
- [ ] Controllo: sulla pagina Contattaci, sopra il pulsante "Invia", compare il riquadro Cloudflare. Fai un invio di prova.

⚠️ La **Secret Key** non va mai condivisa né scritta in chat o nei file del progetto.

---

## Passo 8 — Privacy

Accanto al pulsante "Invia" ora c'è questa frase:
*"Inviando il modulo accetti che i tuoi dati siano usati per rispondere alla tua richiesta, come descritto nella Privacy policy."*

- [ ] Fai verificare la frase al **consulente privacy**.
- [ ] Chiedigli di aggiungere alla Privacy/Cookie policy di arcs-design.com:
  - il **form di contatto** di Expanse (quali dati, per quanto tempo si conservano)
  - **Cloudflare Turnstile**, se attivi il Passo 7
  - **Vercel Analytics**, già presente sul sito
- [ ] Se il consulente vuole una casella di consenso o un testo diverso, chiedi la modifica 🧑‍💻

---

## Passo 9 — Mittente delle email del form 🧑‍💻

Oggi le email del form arrivano da un indirizzo di prova di Resend (`onboarding@resend.dev`), che rischia di finire nello spam.

- [ ] Su **resend.com** → **Domains → Add domain**: aggiungi il dominio ARCS.
- [ ] Resend mostra alcune righe "DNS" da copiare dove è gestito il dominio (il pannello del provider). Se non sai chi gestisce il dominio, chiedi a chi si occupa dell'hosting di arcs-design.com.
- [ ] Quando Resend mostra **Verified**, chiedi di cambiare il mittente nel codice (es. `form@arcs-design.com`) 🧑‍💻

---

## Passo 10 — Attiva la protezione dei contenuti (CSP) 🧑‍💻

Il sito ha una nuova protezione contro l'inserimento di codice malevolo, per ora solo in **modalità di prova**: segnala i problemi ma non blocca nulla.

- [ ] Una settimana dopo la pubblicazione, apri il sito in **Chrome**, premi **Cmd + Opzione + J** (si apre la console) e naviga: home, Progetti, 3–4 schede diverse (con video e con vista 3D), Contattaci.
- [ ] Cerca in console righe rosse o gialle che contengono **"Content-Security-Policy"**. Fai uno screenshot.
- [ ] Manda gli screenshot a chi gestisce il codice: corregge l'elenco e passa la protezione da "prova" ad "attiva".
- [ ] Da ricordare: se un giorno inserite nello Studio un video o una vista 3D da un **sito nuovo** (non Cloudinary, net-fs o myarstudio), va aggiunto all'elenco, altrimenti non si vedrà.

---

## Passo 11 — Hosting

Il sito è commerciale: il piano gratuito di Vercel (Hobby) non lo consente.

- [ ] Verifica su vercel.com → **Settings → Billing** che il piano sia **Pro** (circa 20 $/mese per utente). Se è Hobby, passa a Pro.
- [ ] Controlla che in **Settings → Environment Variables** ci siano tutte queste voci (i valori non vanno toccati):
  `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`

---

## Da tenere a mente (nessuna azione ora)

- **Testi per Google (meta description)**: per ora tutte le pagine usano "Expand Beyond Limits". Quando vuoi, prepara una frase per home, Progetti e Contattaci (massimo 160 caratteri) e chiedi di inserirle.
- **Video e viste 3D**: si potrebbero isolare di più dal resto del sito, ma va provato con calma per non bloccarli.
- **Sanity**: il piano gratuito basta per il sito pubblico, non serve il Growth.

---

### Riepilogo veloce

| # | Cosa | Chi | Fatto |
|---|---|---|---|
| 1 | Controllo in locale | tu | [ ] |
| 2 | Pubblicazione | 🧑‍💻 | [ ] |
| 3 | 3 slug in Sanity | tu | [ ] |
| 4 | Correzioni testi in Sanity | tu | [ ] |
| 5 | Testo alternativo immagini | tu | [ ] |
| 6 | Dominio www su Vercel | tu | [ ] |
| 7 | Turnstile anti-spam | tu | [ ] |
| 8 | Verifica privacy | tu + consulente | [ ] |
| 9 | Mittente email Resend | tu + 🧑‍💻 | [ ] |
| 10 | CSP da prova ad attiva | 🧑‍💻 | [ ] |
| 11 | Piano Vercel Pro | tu | [ ] |
