import type { NextConfig } from "next";
import { SKILL_PROJECTS } from "./src/lib/skillProjects";

// Header di sicurezza applicati a tutte le route (Fix 4).
// Nota: CSP completa non inclusa qui — va testata contro Spline, Sanity Studio
// e gli iframe embed prima di attivarla, per non rompere il sito.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Content Security Policy (audit §12.4), per ora SOLO Report-Only: le
// violazioni compaiono in console del browser ma nulla viene bloccato. Da
// passare a `Content-Security-Policy` dopo aver navigato home, /projects, le
// schede (ognuno dei tre tipi di iframe) e /contact senza violazioni.
//
// - script/style 'unsafe-inline': Next inietta script inline e il sito usa
//   stili inline ovunque. L'alternativa coi nonce obbliga al rendering
//   dinamico di ogni pagina e spegnerebbe l'ISR.
// - 'wasm-unsafe-eval' + blob: worker: runtime Spline.
// - frame-src: host degli iframe che oggi arrivano da Sanity
//   (`heroIframeUrl`) e dell'esperienza Expanse in home. Un host nuovo
//   inserito nello Studio va aggiunto qui. net-fs e' ristretto al percorso
//   del nostro account (`/hosting/8574980/`): il dominio e' condiviso con gli
//   altri clienti net-fs, i loro contenuti non devono poter essere incorniciati.
// - /studio escluso: Sanity Studio va verificato a parte (vedi handoff).
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://unpkg.com https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "media-src 'self' blob: https://cdn.sanity.io",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://prod.spline.design https://unpkg.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src https://player.cloudinary.com https://storage.net-fs.com/hosting/8574980/ https://cdn.myarstudio.cloud https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Le source map del client restano private (default di Next, reso esplicito).
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: {
      // L'unica server action e' il form contatti: 5000 caratteri di messaggio
      // stanno in ~20 KB anche in UTF-8 pieno. Il default e' 1 MB (§12.1).
      bodySizeLimit: "64kb",
    },
  },
  transpilePackages: ["@splinetool/react-spline", "@splinetool/runtime"],
  // Le pagine skill sono state rimosse: i vecchi URL (link salvati, indici dei
  // motori) finiscono sul progetto associato, il resto sulla home.
  async redirects() {
    return [
      ...Object.entries(SKILL_PROJECTS).map(([skill, project]) => ({
        source: `/skills/${skill}`,
        destination: `/projects/${project}`,
        permanent: true,
      })),
      { source: "/skills/:path*", destination: "/", permanent: true },
      // L'indice progetti si chiamava /works (audit §5). `permanent: true`
      // risponde 308, equivalente al 301 per SEO e cache: scelta voluta, come
      // per i redirect /skills sopra. Gli slug rinominati dei singoli progetti
      // sono gestiti nella pagina progetto (`src/lib/projectSlugs.ts`).
      { source: "/works", destination: "/projects", permanent: true },
      { source: "/works/:path*", destination: "/projects/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/((?!studio).*)",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: csp }],
      },
    ];
  },
};

export default nextConfig;
