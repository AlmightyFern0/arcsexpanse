import { DiagonalButton } from "@/components/ui/DiagonalButton";
import { contentContainer } from "@/lib/layout";

// Il portale verso l'esperienza Expanse e' diventato un iframe
// (ExpanseEmbed), spostato in alto subito dopo "Progettiamo mondi".
export default function CosaVedere() {
  return (
    <section
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        ...contentContainer,
        paddingTop: "3rem",
        paddingBottom: "8rem",
      }}
    >
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "2.5rem",
      }}>
        <h2
          className="cosavedere-title"
          style={{
            fontSize: "clamp(1.8rem, 5vw, 4rem)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#ffffff",
            lineHeight: 1.1,
          }}
        >
          COS&apos;ALTRO C&apos;È DA VEDERE?
        </h2>

        <div>
          <DiagonalButton href="/projects">Voglio scoprirlo →</DiagonalButton>
        </div>
      </div>
    </section>
  );
}
