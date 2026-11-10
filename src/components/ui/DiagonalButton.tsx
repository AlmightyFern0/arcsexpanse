"use client";

import { useState } from "react";
import Link from "next/link";

interface DiagonalButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

// Shared CTA style: parallelogram (top-left / bottom-right corners cut) with a
// cyan outline that fills solid on hover. Used across the home CTAs and forms
// so every "primary action" button on the site reads the same.
export function DiagonalButton({ href, children, onClick, type = "button", disabled }: DiagonalButtonProps) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <>
      {/* SVG border + fill — parallelogram: top-left and bottom-right corners cut */}
      <svg
        viewBox="0 0 1 1"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <polygon
          points="0.07,0 1,0 0.93,1 0,1"
          fill={hovered ? "#00f5ff" : "transparent"}
          stroke="#00f5ff"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "fill 0.25s ease" }}
        />
      </svg>
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    padding: "0.85rem 2.8rem",
    color: hovered ? "#08001a" : "#00f5ff",
    fontSize: "0.7rem",
    fontFamily: "var(--font-barlow), sans-serif",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    textDecoration: "none",
    transition: "color 0.25s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    background: "none",
    border: "none",
  };

  if (href) {
    return (
      <Link
        href={href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={sharedStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={sharedStyle}
    >
      {content}
    </button>
  );
}
