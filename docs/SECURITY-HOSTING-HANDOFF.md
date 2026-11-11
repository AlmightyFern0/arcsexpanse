# Handoff — Sicurezza, Hosting & Servizi terze parti

> Doc di continuità. Committa e pulla da altro PC per riprendere questo filone.
> Creato: 2026-07-09 · Branch: `develop`

## 1. Servizi terze parti e costi

| Servizio | Uso nel progetto | Piano gratis | Costo upgrade | Rischio costo |
|----------|------------------|--------------|---------------|---------------|
| **Sanity** (CMS) | Tutto il contenuto (`src/sanity/`), dataset `production` | Free plan | Growth $15/mese/utente | Basso |
| **Vercel** (hosting) | Deploy sito | Hobby (solo non-commerciale) | Pro $20/mese/utente | Medio (licenza) |
| **Resend** (email) | Form contatti (`src/app/contact/actions.ts`) | 3.000 email/mese, 100/giorno | Pro $20/mese (50k) | Basso |
| **Spline** (3D) | Sfere 3D (layout, skills, footer) | Free basic | Solo se più editor | Zero runtime |

### Sanity — mail trial Growth
- Trial Growth gratis scade tra ~7 giorni (mail ricevuta 2026-07 circa).
- Feature Growth (private datasets, user roles, comments, scheduled drafts, AI assist) **NON servono** per sito pubblico.
- **Azione:** lasciare scadere → torna a Free plan. Sito continua a funzionare (query GROQ pubbliche = free).
- Free limiti: 3 utenti, 2 dataset, 500k richieste CDN/mese, 10GB bandwidth, 5GB assets.
- ISR `revalidate = 30` → poche chiamate a Sanity. Difficile sforare il free.

## 2. Decisione hosting

**Sito ARCS = commerciale → Vercel Hobby NON basta (ToS vieta uso commerciale).**

### Migliore assoluto: Vercel Pro ($20/mese/utente)
Motivi:
- Creatori Next.js → ISR + Server Actions (il form) nativi, zero edge case.
- HTTPS/TLS auto, DDoS protection, edge network.
- Firewall + rate limiting configurabile (Pro), WAF.
- Env/secrets gestiti bene, mai nel client bundle.

### Vantaggi Pro vs Hobby
| Cosa | Hobby | Pro |
|------|-------|-----|
| Uso commerciale | ❌ vietato | ✅ |
| Bandwidth | 100GB | 1TB |
| Collaboratori team | ❌ | ✅ |
| Password protection | ❌ | ✅ |
| Analytics / Speed Insights | limitato | ✅ |
| Function duration | 10s | 60s+ |

### Alternative (se si evita Vercel — il deploy va fatto sul nuovo host)
Lo stack richiede Node runtime (ISR + Server Actions), non solo statico.

| Host | Costo | Note |
|------|-------|------|
| Vercel Pro | $20/mese | zero config, nativo Next |
| Cloudflare Pages | free generoso | commerciale OK anche free, MA Next SSR/ISR più fragile |
| VPS (Hetzner/DO) | $5-6/mese | `next start`, gestisci tu SSL/firewall/patch |
| Railway / Render | ~$5-7/mese | Node host, deploy da git |

**Verdetto:** Vercel Pro per zero pensieri e sicurezza gestita.

## 3. Problemi di sicurezza — DA RISOLVERE

Superficie principale = form contatti (`src/app/contact/actions.ts`, server action = endpoint HTTP pubblico).

| # | Severità | Problema | File |
|---|----------|----------|------|
| 1 | 🔴 CRITICO | **No validazione server**. Client `required` bypassabile con POST diretto. Nessun check lunghezza/formato/campi. | `contact/actions.ts` |
| 2 | 🔴 CRITICO | **No rate limiting**. Spam martella endpoint → brucia quota Resend → DoS email + costi. | `contact/actions.ts` |
| 3 | 🟠 ALTO | **HTML injection in email**. `data.nome/email/messaggio` interpolati grezzi in HTML → phishing/tracker. Va escaped. | `contact/actions.ts` |
| 4 | 🟠 ALTO | **Zero security headers**. No CSP, X-Frame-Options, HSTS. `/studio` embeddabile → clickjacking. | `next.config.ts` |
| 5 | 🟡 MEDIO | **Dominio email non verificato**: `from: onboarding@resend.dev` (test). Produzione → spam. Verificare dominio ARCS. | `contact/actions.ts` |
| 6 | 🟡 MEDIO | **No honeypot/anti-bot** nel form. | `contact/ContactForm.tsx` |

## 4. Piano fix — stato aggiornato

- [x] **Fix 1 — Validazione server** (zod): nome 1–100 required, email valida, messaggio ≤5000, categoria ≤200, tags ≤50. In `sendContactEmail`. ✅
- [x] **Fix 3 — Escape HTML** input prima di interpolare nel template email. ✅
- [x] **Fix 4 — Security headers** in `next.config.ts`: HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. ✅ (CSP completa NON inclusa — vedi sotto)
- [x] **Fix 6 — Honeypot** campo nascosto `website` nel form + scarto server-side. ✅
- [x] **Fix 2 — Rate limiting** ✅ FATTO + testato. Upstash Redis, 5 invii/10min per IP. Modulo `src/lib/ratelimit.ts`, check in `sendContactEmail` via `x-forwarded-for`. Env: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (in `.env.local` e su Vercel). Se env mancano → limite saltato (dev).
- [ ] **Fix 5 — Verifica dominio Resend**: `from` già cambiato in `form@arcs-design.com` (con ripiego automatico su `onboarding@resend.dev` finché Resend risponde 403 "domain not verified"). Resta la verifica DNS di `arcs-design.com` su Resend. ⏳ richiede DNS.
- [~] **CSP** — attiva in **Report-Only** (`next.config.ts`, esclusa `/studio`). Da passare in enforcement dopo aver navigato home, /projects, le schede (iframe Cloudinary, net-fs, myarstudio) e /contact senza violazioni in console. Un nuovo host di iframe inserito nello Studio va aggiunto a `frame-src`.

### Audit 2026-11-10 (§12, branch `fix/audit-wcag-sicurezza`)
- [x] Validazione più stretta: CR/LF rimossi da nome/email (no header injection), campi extra rifiutati (`strict`), categoria e tag **obbligatori** e solo da allowlist (`src/app/contact/formOptions.ts` + skill da Sanity).
- [x] Errori generici all'utente; nei log solo il tipo di errore, mai il contenuto. Prima l'errore restituito da Resend veniva ignorato (l'utente vedeva "inviato" anche a invio fallito): ora è gestito.
- [x] Email anche in testo semplice, oltre all'HTML escapato.
- [x] Rate limit anche **per email** (hash) e **tetto giornaliero** per IP (20/giorno); deduplica degli invii identici per 10 min (Upstash).
- [x] Tempo minimo di compilazione (3 s) → finto successo per i bot.
- [x] Body delle server action limitato a 64 KB. Controllo Origin: integrato in Next (verificato: Origin estranea rifiutata).
- [x] Informativa privacy con link vicino al pulsante "Invia" (da far verificare al consulente privacy).
- [x] **Cloudflare Turnstile** integrato ma spento: si accende mettendo su Vercel **entrambe** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` (la secret MAI con prefisso `NEXT_PUBLIC_`). Dichiararlo nell'informativa cookie/privacy.
- [ ] HSTS ha già `preload`: l'audit suggerisce di aggiungerlo solo dopo test; verificare che tutti i sottodomini di arcs-expanse.com siano su HTTPS prima di iscrivere il dominio alla preload list.
- [ ] `iframe` senza `sandbox`: non aggiunto per non rompere i player (Cloudinary, myarstudio AR); da valutare con test.
- [ ] Host canonico: impostare su Vercel il 301 da `arcs-expanse.com` a `www.arcs-expanse.com`.

## 5. Stato / prossimo passo

- Fix applicati + testati: 1, 2, 3, 4, 6 ✅ (2026-07). Tutti i critici/alti chiusi.
- **Aperti (in lista per dopo):**
  1. **Dominio Resend (Fix 5)** — verifica DNS di `arcs-design.com`; il `from` è già `form@arcs-design.com`.
  2. **CSP completa** — test contro Spline/Studio/iframe.
- Env su Vercel (Settings → Environment Variables): `RESEND_API_KEY` + 3 Sanity + `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — tutte messe ✅.
- Note stack: Next.js 15 App Router, React 19, TS. Styling inline (NON Tailwind). `@/*` → `./src/*`.
