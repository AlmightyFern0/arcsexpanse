"use client";

// Segnaposto mostrato finché la scena Spline non è pronta.
export function SplinePlaceholder({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
      }}
    >
      <div
        className="spline-placeholder-ring"
        style={{
          width: "38%",
          aspectRatio: "1",
          borderRadius: "50%",
          border: "1px solid rgba(0, 245, 255, 0.28)",
        }}
      />
    </div>
  );
}
