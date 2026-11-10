"use client";

import { useState } from "react";
import { useCanHover } from "@/hooks/useCanHover";

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Su touch `mouseleave` non scatta, quindi l'hover va ignorato lì.
  const canHover = useCanHover();
  const filled = active || (canHover && hovered);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.38rem 1.1rem",
        transform: "skewX(-8deg)",
        border: "1px solid #00f5ff",
        background: filled ? "#00f5ff" : "transparent",
        transition: "background 0.2s ease",
      }}>
        <span style={{
          display: "inline-block",
          transform: "skewX(8deg)",
          fontSize: "0.58rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "var(--font-barlow), sans-serif",
          color: filled ? "#08001a" : "#00f5ff",
          whiteSpace: "nowrap",
          transition: "color 0.2s ease",
        }}>
          {label}
        </span>
      </span>
    </button>
  );
}
