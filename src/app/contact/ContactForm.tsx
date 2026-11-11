"use client";

import { useEffect, useRef, useState } from "react";
import { FilterChip } from "@/components/ui/FilterChip";
import { SkillChip } from "@/components/ui/SkillChip";
import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { PRIVACY_POLICY_URL } from "@/lib/site";
import { sendContactEmail } from "./actions";
import { LIMITS, OTHER_CATEGORY, REQUIRED_MESSAGES, TAGS } from "./formOptions";
import TurnstileWidget, { TURNSTILE_ENABLED } from "./TurnstileWidget";
import { scrollPageTo } from "@/lib/smoothScroll";

interface Skill {
  _id: string;
  title: string;
}

// Stili dei campi in CSS e non inline: uno stile inline batte qualunque
// regola `:focus-visible`, ed e' cosi' che il focus era sparito (audit §6).
//
// - 16px: sotto, iOS zooma la pagina al focus.
// - Bordo inferiore ciano al 75%: e' lui che disegna il campo (il riempimento
//   viola e' poco distinto dal fondo), quindi deve stare sopra 3:1 (WCAG 1.4.11).
// - Focus: bordo pieno e piu' spesso, oltre all'anello globale.
const FORM_CSS = `
  .contact-field {
    width: 100%;
    background: rgba(68, 25, 174, 0.65);
    border: none;
    border-bottom: 2px solid rgba(0, 245, 255, 0.75);
    color: #fff;
    padding: 0.75rem 1rem;
    font-size: 16px;
    font-family: var(--font-space-grotesk), sans-serif;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }
  .contact-field::placeholder { color: rgba(255, 255, 255, 0.7); }
  .contact-field:focus-visible {
    border-bottom: 3px solid #00f5ff;
  }
  .contact-fieldset {
    border: none;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
`;

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.8)",
  letterSpacing: "0.05em",
};

const FIELD_WRAP: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.4rem" };

export default function ContactForm({ skills }: { skills: Skill[] }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [website, setWebsite] = useState(""); // honeypot anti-bot
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<{ categoria?: boolean; tags?: boolean }>({});
  const categoriaRef = useRef<HTMLFieldSetElement>(null);
  const tagsRef = useRef<HTMLFieldSetElement>(null);

  // Istante di apertura del form, per il controllo anti-bot sul tempo minimo.
  // In un effetto e non nel render: `Date.now()` divergerebbe fra server e client.
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  // Dopo l'invio il form sparisce: il focus va sul messaggio di conferma,
  // altrimenti chi usa uno screen reader resta su un elemento che non c'e' piu'.
  const successRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const categories = [...skills.map((s) => s.title), OTHER_CATEGORY];

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // Le due scelte a chip non sono campi nativi: il `required` del browser
    // non le copre, il controllo e' qui (e di nuovo sul server). Il focus va
    // al primo chip del gruppo mancante.
    const missingNow = { categoria: !categoria, tags: tags.length === 0 };
    setMissing(missingNow);
    if (missingNow.categoria || missingNow.tags) {
      setError(missingNow.categoria ? REQUIRED_MESSAGES.categoria : REQUIRED_MESSAGES.tags);
      const group = missingNow.categoria ? categoriaRef.current : tagsRef.current;
      group?.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setError("Attendi la verifica anti-spam e riprova.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await sendContactEmail({
        nome, email, messaggio, categoria, tags, website,
        elapsedMs: openedAt.current ? Date.now() - openedAt.current : undefined,
        turnstileToken: turnstileToken || undefined,
      });
      if (res.ok) {
        setSubmitted(true);
        scrollPageTo(0);
      } else {
        setError(res.error ?? "Invio non riuscito, riprova tra poco.");
        // Un token Turnstile vale una volta sola: dopo un errore ne serve uno nuovo.
        if (TURNSTILE_ENABLED) {
          setTurnstileToken("");
          setTurnstileKey((k) => k + 1);
        }
      }
    } catch {
      setError("Invio non riuscito, riprova tra poco.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        color: "#fff",
        textAlign: "center",
      }}>
        <h2
          ref={successRef}
          tabIndex={-1}
          style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#00f5ff",
          }}
        >
          Messaggio inviato!
        </h2>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)" }}>
          Ti risponderemo il prima possibile.
        </p>
      </div>
    );
  }

  return (
    <form
      id="modulo"
      tabIndex={-1}
      className="skip-target"
      aria-label="Modulo di contatto"
      onSubmit={handleSubmit}
      aria-busy={submitting}
      style={{ display: "flex", flexDirection: "column", gap: "3rem" }}
    >
      <style>{FORM_CSS}</style>

      {/* Honeypot anti-bot: nascosto agli utenti, i bot lo compilano */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />

      {/* ── Contattaci ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 4rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#fff",
          margin: 0,
        }}>
          Contattaci
        </h1>

        <p style={{ ...LABEL_STYLE, margin: 0 }}>
          I campi contrassegnati con * sono obbligatori.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={FIELD_WRAP}>
            <label htmlFor="contact-nome" style={LABEL_STYLE}>
              Nome*
            </label>
            <input
              id="contact-nome"
              name="nome"
              className="contact-field"
              required
              autoComplete="name"
              maxLength={LIMITS.nome}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
            />
          </div>
          <div style={FIELD_WRAP}>
            <label htmlFor="contact-email" style={LABEL_STYLE}>
              Email*
            </label>
            <input
              id="contact-email"
              name="email"
              className="contact-field"
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={LIMITS.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
            />
          </div>
        </div>

        <div style={FIELD_WRAP}>
          <label htmlFor="contact-messaggio" style={LABEL_STYLE}>
            Messaggio
          </label>
          <textarea
            id="contact-messaggio"
            name="messaggio"
            className="contact-field"
            maxLength={LIMITS.messaggio}
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            rows={5}
            style={{ resize: "vertical" }}
          />
        </div>
      </section>

      {/* ── Descrivi l'idea ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <h2 style={{
          fontSize: "clamp(1.4rem, 3vw, 2.5rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#fff",
          margin: 0,
        }}>
          Prova a descrivere la tua idea
        </h2>

        {/* Categoria: scelta singola. fieldset + legend danno il contesto a
            ogni chip; lo stato lo dice `aria-pressed` sul chip. */}
        <fieldset
          ref={categoriaRef}
          className="contact-fieldset"
          aria-describedby={missing.categoria ? "contact-categoria-error" : undefined}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <legend style={{ ...LABEL_STYLE, padding: 0, marginBottom: "0.75rem" }}>
            La mia idea rientra in questa categoria* (una scelta)
          </legend>
          {missing.categoria && (
            <p id="contact-categoria-error" style={{ fontSize: "14px", color: "#ff6b6b", margin: 0 }}>
              {REQUIRED_MESSAGES.categoria}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {categories.map((cat) => (
              <SkillChip
                key={cat}
                label={cat}
                active={categoria === cat}
                onClick={() => {
                  setCategoria(cat === categoria ? "" : cat);
                  setMissing((m) => ({ ...m, categoria: false }));
                }}
              />
            ))}
          </div>
        </fieldset>

        {/* Tags: scelta multipla */}
        <fieldset
          ref={tagsRef}
          className="contact-fieldset"
          aria-describedby={missing.tags ? "contact-tags-error" : undefined}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <legend style={{ ...LABEL_STYLE, padding: 0, marginBottom: "0.75rem" }}>
            Nella mia idea ci saranno* (anche più scelte)
          </legend>
          {missing.tags && (
            <p id="contact-tags-error" style={{ fontSize: "14px", color: "#ff6b6b", margin: 0 }}>
              {REQUIRED_MESSAGES.tags}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {TAGS.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={tags.includes(tag)}
                onClick={() => {
                  toggleTag(tag);
                  setMissing((m) => ({ ...m, tags: false }));
                }}
              />
            ))}
          </div>
        </fieldset>
      </section>

      {/* ── Submit ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {TURNSTILE_ENABLED && (
          <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />
        )}

        {/* Informativa privacy vicino al pulsante (audit §12.3). */}
        <p style={{ ...LABEL_STYLE, margin: 0, maxWidth: "40rem", lineHeight: 1.6 }}>
          Inviando il modulo accetti che i tuoi dati siano usati per rispondere
          alla tua richiesta, come descritto nella{" "}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#00f5ff", textDecoration: "underline" }}
          >
            Privacy policy<span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          .
        </p>

        {/* Sempre nel DOM: una regione live annuncia solo i cambi di
            contenuto, se nasce gia' piena puo' non essere letta. */}
        <p role="alert" style={{ fontSize: "14px", color: "#ff6b6b", margin: 0, minHeight: error ? undefined : 0 }}>
          {error}
        </p>
        <div>
          <DiagonalButton type="submit" disabled={submitting}>
            {submitting ? "Invio..." : "Invia"} <span aria-hidden="true">→</span>
          </DiagonalButton>
        </div>
      </div>
    </form>
  );
}
