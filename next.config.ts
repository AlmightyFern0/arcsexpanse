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

const nextConfig: NextConfig = {
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
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
