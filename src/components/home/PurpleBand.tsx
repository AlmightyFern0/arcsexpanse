import type { ReactNode } from "react";

// Blocco viola con le diagonali sopra e sotto, identico allo sfondo di
// SkillsSection: chi ci sta dentro condivide un unico sfondo.
const SLANT = "8.75vw";

export default function PurpleBand({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        background: "#4419AE",
        clipPath: `polygon(0 ${SLANT}, 100% 0, 100% calc(100% - ${SLANT}), 0 100%)`,
        paddingTop: `calc(${SLANT} + 3rem)`,
        paddingBottom: `calc(${SLANT} + 3rem)`,
        // Stacco dal blocco viola delle skill che segue.
        marginBottom: "3rem",
      }}
    >
      {children}
    </div>
  );
}
