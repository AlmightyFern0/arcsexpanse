"use server";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { headers } from "next/headers";
import { client } from "@/sanity/lib/client";
import { skillsQuery } from "@/sanity/queries";
import { contactDailyRatelimit, contactRatelimit, isDuplicateSubmission } from "@/lib/ratelimit";
import { LIMITS, MIN_FILL_MS, OTHER_CATEGORY, REQUIRED_MESSAGES, TAGS } from "./formOptions";

export interface ContactFormData {
  nome: string;
  email: string;
  messaggio: string;
  categoria: string;
  tags: string[];
  // Honeypot: campo nascosto, deve restare vuoto (i bot lo compilano)
  website?: string;
  /** Millisecondi fra apertura del form e invio (anti-bot). */
  elapsedMs?: number;
  /** Token Cloudflare Turnstile, se il CAPTCHA e' attivo. */
  turnstileToken?: string;
}

type Result = { ok: boolean; error?: string };

// Messaggi all'utente: generici, mai dettagli del provider o stack (§12.3).
// Mittente e destinatario delle email del form. Il mittente richiede il
// dominio arcs-design.com verificato su Resend (resend.com → Domains).
const CONTACT_FROM = "Expanse Form <form@arcs-design.com>";
const CONTACT_FROM_FALLBACK = "Expanse Form <onboarding@resend.dev>";
const CONTACT_TO = "studio@arcs-design.com";

/** Errore Resend "dominio non verificato" (403 con messaggio sul dominio). */
function isUnverifiedDomain(error: { message: string; statusCode: number | null }): boolean {
  return error.statusCode === 403 && /domain/i.test(error.message) && /verif/i.test(error.message);
}

const GENERIC_ERROR = "Invio non riuscito, riprova tra poco.";
const RATE_LIMIT_ERROR = "Troppi invii. Riprova tra qualche minuto.";

/** Toglie CR/LF e caratteri di controllo: niente header injection (§12.1.3). */
const singleLine = (v: string) => v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

const USER_MESSAGES = new Set<string>([
  "Il nome è obbligatorio.",
  "Il nome è troppo lungo.",
  "Email non valida.",
  "Il messaggio è troppo lungo.",
  REQUIRED_MESSAGES.categoria,
  REQUIRED_MESSAGES.tags,
]);

// Validazione al confine (§12.1): lunghezze, formato, campi extra rifiutati.
const contactSchema = z
  .object({
    nome: z
      .string()
      .transform(singleLine)
      .pipe(z.string().min(1, "Il nome è obbligatorio.").max(LIMITS.nome, "Il nome è troppo lungo.")),
    email: z
      .string()
      .transform(singleLine)
      .pipe(z.string().max(LIMITS.email, "Email non valida.").email("Email non valida.")),
    messaggio: z.string().trim().max(LIMITS.messaggio, "Il messaggio è troppo lungo.").default(""),
    categoria: z
      .string()
      .transform(singleLine)
      .pipe(z.string().min(1, REQUIRED_MESSAGES.categoria).max(200)),
    tags: z.array(z.string()).min(1, REQUIRED_MESSAGES.tags).max(TAGS.length),
    website: z.string().max(500).default(""),
    elapsedMs: z.number().finite().nonnegative().optional(),
    turnstileToken: z.string().max(4096).optional(),
  })
  .strict();

/** Escape HTML per evitare injection nel corpo email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Categorie ammesse: skill visibili su Sanity + "non lo so". Se Sanity non
 *  risponde si accetta qualunque testo breve (gia' validato ed escapato):
 *  meglio un'etichetta non in lista che perdere un contatto. */
async function allowedCategories(): Promise<Set<string> | null> {
  try {
    const skills: { title?: string }[] = await client.fetch(skillsQuery);
    return new Set([...skills.map((s) => s.title ?? "").filter(Boolean), OTHER_CATEGORY]);
  } catch {
    return null;
  }
}

/** Verifica lato server del token Turnstile (§12.2). Attivo solo se ci sono
 *  entrambe le chiavi: con la sola secret il form rifiuterebbe ogni invio. */
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function sendContactEmail(data: ContactFormData): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY non configurata");
    return { ok: false, error: GENERIC_ERROR };
  }

  // Validazione input
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    // All'utente solo i messaggi scritti da noi; quelli interni di zod
    // (tipi sbagliati, campi extra) restano generici.
    const message = parsed.error.issues[0]?.message ?? "";
    return { ok: false, error: USER_MESSAGES.has(message) ? message : "Dati non validi." };
  }
  const input = parsed.data;

  // Honeypot o invio troppo rapido: bot → finto successo, nessun invio (Fix 6).
  if (input.website.trim() !== "") return { ok: true };
  if (input.elapsedMs !== undefined && input.elapsedMs < MIN_FILL_MS) return { ok: true };

  // Allowlist (§12.1): solo valori delle opzioni mostrate nel form.
  const tagSet = new Set<string>(TAGS);
  if (!input.tags.every((t) => tagSet.has(t)) || new Set(input.tags).size !== input.tags.length) {
    return { ok: false, error: "Dati non validi." };
  }
  const categories = await allowedCategories();
  if (categories && !categories.has(input.categoria)) {
    return { ok: false, error: "Dati non validi." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // CAPTCHA (se configurato).
  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return { ok: false, error: "Verifica anti-spam non riuscita. Ricarica la pagina e riprova." };
  }

  // Rate limiting (Fix 2 + §12.2): per IP, per email e tetto giornaliero per IP.
  // L'email entra solo come hash: niente dati personali nelle chiavi Redis.
  const emailKey = sha256(input.email.toLowerCase());
  if (contactRatelimit && contactDailyRatelimit) {
    const [byIp, byEmail, daily] = await Promise.all([
      contactRatelimit.limit(`ip:${ip}`),
      contactRatelimit.limit(`email:${emailKey}`),
      contactDailyRatelimit.limit(ip),
    ]);
    if (!byIp.success || !byEmail.success || !daily.success) {
      return { ok: false, error: RATE_LIMIT_ERROR };
    }
  }

  // Stesso invio ripetuto (doppio click, refresh): non si rimanda, e la
  // risposta e' identica al successo.
  if (await isDuplicateSubmission(sha256(`${input.email.toLowerCase()}\n${input.messaggio}`))) {
    return { ok: true };
  }

  const nome = escapeHtml(input.nome);
  const email = escapeHtml(input.email);
  const messaggio = escapeHtml(input.messaggio);
  const categoria = escapeHtml(input.categoria);
  const tags = input.tags.map(escapeHtml);

  try {
    const resend = new Resend(apiKey);
    // `from` e `to` fissi; l'unico header da input utente e' `replyTo`, con
    // l'email gia' validata e ripulita da CR/LF. Oggetto da `input.nome`, gia'
    // su una riga sola (in testo, non HTML: niente escape qui).
    const message = {
      to: CONTACT_TO,
      replyTo: input.email,
      subject: `Nuovo contatto: ${input.nome}`,
      text: [
        "Nuovo messaggio dal form di contatto",
        "",
        `Nome: ${input.nome}`,
        `Email: ${input.email}`,
        `Messaggio: ${input.messaggio || "—"}`,
        "",
        `Categoria: ${input.categoria || "—"}`,
        `Tag selezionati: ${input.tags.length > 0 ? input.tags.join(", ") : "—"}`,
      ].join("\n"),
      html: `
        <h2>Nuovo messaggio dal form di contatto</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Messaggio:</strong> ${messaggio.replace(/\n/g, "<br />") || "—"}</p>
        <hr />
        <p><strong>Categoria:</strong> ${categoria || "—"}</p>
        <p><strong>Tag selezionati:</strong> ${tags.length > 0 ? tags.join(", ") : "—"}</p>
      `,
    };
    let { error } = await resend.emails.send({ from: CONTACT_FROM, ...message });
    // Dominio non ancora verificato su Resend: si ripiega sul mittente di
    // prova, cosi' il form non si rompe nell'attesa. Nessun doppio invio: se
    // il primo tentativo e' rifiutato, non e' partito nulla.
    if (error && isUnverifiedDomain(error)) {
      console.warn("[contact] dominio mittente non verificato su Resend: uso il mittente di prova");
      ({ error } = await resend.emails.send({ from: CONTACT_FROM_FALLBACK, ...message }));
    }
    // L'SDK Resend non lancia: l'errore torna nel risultato. Prima veniva
    // ignorato e l'utente vedeva "inviato" anche quando non lo era.
    if (error) {
      console.error("[contact] invio Resend fallito:", error.name);
      return { ok: false, error: GENERIC_ERROR };
    }
    return { ok: true };
  } catch (err) {
    // Nei log solo il tipo di errore: niente contenuto del messaggio.
    console.error("[contact] errore invio:", err instanceof Error ? err.name : "unknown");
    return { ok: false, error: GENERIC_ERROR };
  }
}
