"use client";

import { useState } from "react";

export function SkillChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = active || hovered;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlighted ? "rgba(68, 25, 174, 0.95)" : "rgba(68, 25, 174, 0.65)",
        border: "none",
        outline: "none",
        color: "#fff",
        padding: "0.85rem 1rem",
        fontSize: "0.6rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontFamily: "var(--font-barlow), sans-serif",
        cursor: "pointer",
        textAlign: "center",
        lineHeight: 1.5,
        transition: "outline-color 0.2s, background 0.2s",
        minHeight: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}
