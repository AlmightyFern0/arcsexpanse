import { NextResponse, type NextRequest } from "next/server";
import { PROJECT_VISIBLE } from "@/sanity/filters";
import { alternateProjectSlug, normalizeSlugParam } from "@/lib/projectSlugs";

// Stato HTTP corretto per le schede progetto (audit §8.1 e §9.3).
//
// I `loading.tsx` (lo splash durante la navigazione) aprono uno streaming che
// parte con 200 prima che la pagina possa chiamare `notFound()` o
// `redirect()`: il risultato erano soft-404 e redirect solo lato client.
// Qui la decisione arriva prima del rendering:
// - slug esistente           → si prosegue, nulla cambia;
// - slug rinominato          → 308 verso il nuovo (307 verso il vecchio finché
//                              il cambio nello Studio non è fatto);
// - slug mai esistito        → rewrite su una rotta inesistente = 404 vero
//                              con la pagina `not-found.tsx`.
// Se Sanity non risponde si prosegue: decide la pagina, come prima.

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET;
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-02-22";

const EXISTS_QUERY = `{
  "found": count(*[${PROJECT_VISIBLE} && slug.current == $slug]) > 0,
  "altFound": count(*[${PROJECT_VISIBLE} && slug.current == $alt]) > 0
}`;

// Qualunque percorso senza rotta: Next risponde 404 con `not-found.tsx`.
const NOT_FOUND_PATH = "/__progetto-non-trovato";

async function lookup(slug: string, alt: string | null) {
  const url = new URL(`https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}`);
  url.searchParams.set("query", EXISTS_QUERY);
  url.searchParams.set("$slug", JSON.stringify(slug));
  url.searchParams.set("$alt", JSON.stringify(alt ?? ""));
  const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`sanity ${res.status}`);
  const body = (await res.json()) as { result?: { found?: boolean; altFound?: boolean } };
  return { found: body.result?.found === true, altFound: body.result?.altFound === true };
}

export async function middleware(req: NextRequest) {
  // I prefetch di <Link> non servono a decidere niente: niente query extra.
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }
  if (!PROJECT_ID || !DATASET) return NextResponse.next();

  const raw = req.nextUrl.pathname.split("/")[2] ?? "";
  const slug = normalizeSlugParam(raw);
  if (!slug) return NextResponse.next();
  const alt = alternateProjectSlug(slug);

  try {
    const { found, altFound } = await lookup(slug, alt?.slug ?? null);
    if (found) return NextResponse.next();
    if (alt && altFound) {
      const to = req.nextUrl.clone();
      to.pathname = `/projects/${encodeURIComponent(alt.slug)}`;
      return NextResponse.redirect(to, alt.permanent ? 308 : 307);
    }
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, req.url));
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Solo le schede: un segmento sotto /projects (l'indice /projects no).
  matcher: "/projects/:slug",
};
