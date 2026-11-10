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
      aria-pressed={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlighted ? "rgba(68, 25, 174, 0.95)" : "rgba(68, 25, 174, 0.65)",
        border: "none",
        color: "#fff",
        padding: "0.85rem 1rem",
        fontSize: "max(12px, 0.75rem)",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontFamily: "var(--font-barlow), sans-serif",
        cursor: "pointer",
        textAlign: "center",
        lineHeight: 1.5,
        transition: "background 0.2s",
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
