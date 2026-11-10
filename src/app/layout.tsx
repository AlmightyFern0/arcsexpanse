import type { Metadata } from "next";
import { Space_Grotesk, Barlow } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NavigationSplash from "@/components/layout/NavigationSplash";
import { SPLINE_VIEWER_SRC } from "@/lib/splineViewerSrc";
import { SPLINE_ENABLED } from "@/lib/featureFlags";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-barlow",
});

// L'immagine di anteprima dei link e' `opengraph-image.jpg` in questa cartella:
// Next la aggiunge da solo. Su Vercel l'URL assoluto lo ricava dal dominio di
// produzione (`VERCEL_PROJECT_PRODUCTION_URL`), senza `metadataBase` a mano.
export const metadata: Metadata = {
  title: "Expanse by Arc's",
  description: "Expand Beyond Limits",
  openGraph: {
    title: "Expanse by Arc's",
    description: "Expand Beyond Limits",
    siteName: "Expanse by Arc's",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Expanse by Arc's",
    description: "Expand Beyond Limits",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${spaceGrotesk.variable} ${barlow.variable}`}>
      <head>
        {/* Lo script del viewer Spline oggi si inietta via `useEffect`, quindi
            il download non parte finché React non ha idratato — latenza persa
            prima ancora che la costruzione della scena (lenta, sincrona)
            possa cominciare. Alla prima visita di un utente (cache vuota,
            come un hard refresh) è esattamente questo ritardo in più a far
            sentire il blocco — su hardware debole, a farlo cadere del tutto.
            `modulepreload` lo scarica e compila già durante il parse del
            documento, in parallelo col resto della pagina. `preconnect`
            sull'origine delle scene `.splinecode` risparmia poi l'handshake
            quando il viewer le richiede. */}
        {/* A flag spento non si scarica nemmeno il viewer. */}
        {SPLINE_ENABLED && (
          <>
            <link rel="modulepreload" href={SPLINE_VIEWER_SRC} />
            <link rel="preconnect" href="https://prod.spline.design" />
          </>
        )}
      </head>
      <body style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }} suppressHydrationWarning>
        {children}
        <NavigationSplash />
        <Analytics />
      </body>
    </html>
  );
}
