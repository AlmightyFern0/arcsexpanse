// Schermata di caricamento nera con logo e spinner. Nessuna logica: la
// visibilita' la decide chi la usa (PageLoader, NavigationSplash, loading.tsx).
export default function Splash({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="ARCS"
        style={{ width: 300, objectFit: "contain" }}
      />
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid rgba(0,245,255,0.15)",
          borderTopColor: "#00F5FF",
          animation: "arcs-spin 0.9s linear infinite",
        }}
      />
      <style>{`
        @keyframes arcs-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
