"use server";

import { Resend } from "resend";
import { z } from "zod";
import { headers } from "next/headers";
import { contactRatelimit } from "@/lib/ratelimit";

export interface ContactFormData {
  nome: string;
  email: string;
  messaggio: string;
  categoria: string;
  tags: string[];
  // Honeypot: campo nascosto, deve restare vuoto (i bot lo compilano)
  website?: string;
}

// Validazione input al confine (Fix 1)
const contactSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(200),
  messaggio: z.string().trim().max(5000).optional().default(""),
  categoria: z.string().trim().max(200).optional().default(""),
  tags: z.array(z.string().trim().max(200)).max(50).optional().default([]),
  website: z.string().optional().default(""),
});

/** Escape HTML per evitare injection nel corpo email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactEmail(data: ContactFormData): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata");
    return { ok: false, error: "Servizio email non configurato" };
  }

  // Validazione input
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dati non validi";
    return { ok: false, error: first };
  }
  const input = parsed.data;

  // Honeypot: se compilato è un bot → fingi successo senza inviare (Fix 6)
  if (input.website.trim() !== "") {
    return { ok: true };
  }

  // Rate limiting IP-based (Fix 2): max 5 invii / 10 min. Skip se Upstash non configurato.
  if (contactRatelimit) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success } = await contactRatelimit.limit(ip);
    if (!success) {
      return { ok: false, error: "Troppi invii. Riprova tra qualche minuto." };
    }
  }

  const nome = escapeHtml(input.nome);
  const email = escapeHtml(input.email);
  const messaggio = escapeHtml(input.messaggio);
  const categoria = escapeHtml(input.categoria);
  const tags = input.tags.map(escapeHtml);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Expanse Form <onboarding@resend.dev>",
      to: "studio@arcs-design.com",
      replyTo: input.email,
      subject: `Nuovo contatto: ${nome}`,
      html: `
        <h2>Nuovo messaggio dal form di contatto</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Messaggio:</strong> ${messaggio || "—"}</p>
        <hr />
        <p><strong>Categoria:</strong> ${categoria || "—"}</p>
        <p><strong>Tag selezionati:</strong> ${tags.length > 0 ? tags.join(", ") : "—"}</p>
      `,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    return { ok: false, error: msg };
  }
}
