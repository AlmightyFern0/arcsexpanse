"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/FilterChip";
import { SkillChip } from "@/components/ui/SkillChip";
import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { sendContactEmail } from "./actions";

const TAGS = [
  "Video animazione 3D",
  "FOOH & 3D OOH",
  "Immersive Room",
  "Virtual Showroom 3D",
  "Rendering",
  "Expo",
  "Industrial Design",
  "Food Design",
  "Packaging Design",
  "Digital Twin",
  "VR & AR",
  "App & Gaming",
  "Hologram",
  "Interior Design",
  "Marketing Strategic Visualization",
  "AI",
  "Non lo so, voglio che me lo dite voi",
];

interface Skill {
  _id: string;
  title: string;
}

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(68, 25, 174, 0.65)",
  border: "none",
  borderBottom: "2px solid rgba(0,245,255,0.3)",
  color: "#fff",
  padding: "0.75rem 1rem",
  fontSize: "14px",
  fontFamily: "var(--font-space-grotesk), sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

export default function ContactForm({ skills }: { skills: Skill[] }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [website, setWebsite] = useState(""); // honeypot anti-bot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    ...skills.map((s) => s.title),
    "Non lo so, voglio che me lo diate voi",
  ];

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await sendContactEmail({ nome, email, messaggio, categoria, tags, website });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(res.error ?? "Errore nell'invio");
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
        <h2 style={{
          fontSize: "clamp(2rem, 4vw, 3.5rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#00f5ff",
        }}>
          Messaggio inviato!
        </h2>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)" }}>
          Ti risponderemo il prima possibile.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em" }}>
              Nome*
            </label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              style={FIELD_STYLE}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em" }}>
              email*
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              style={FIELD_STYLE}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em" }}>
            Messaggio
          </label>
          <textarea
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            rows={5}
            style={{ ...FIELD_STYLE, resize: "vertical" }}
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

        {/* Categoria */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
            La mia idea rientra in questa categoria*
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {categories.map((cat) => (
              <SkillChip
                key={cat}
                label={cat}
                active={categoria === cat}
                onClick={() => setCategoria(cat === categoria ? "" : cat)}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
            Nella mia idea ci saranno*
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {TAGS.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Submit ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {error && (
          <p style={{ fontSize: "13px", color: "#ff4444" }}>{error}</p>
        )}
        <div>
          <DiagonalButton type="submit" disabled={submitting}>
            {submitting ? "Invio..." : "Invia"} →
          </DiagonalButton>
        </div>
      </div>
    </form>
  );
}
