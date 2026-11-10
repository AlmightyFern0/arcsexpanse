import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { projectBySlugQuery, nextProjectsQuery } from "@/sanity/queries";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/Footer";
import PageLoader from "@/components/layout/PageLoader";
import HeroAmbientLight from "@/components/home/HeroAmbientLight";
import SkillProjectGrid from "@/components/skills/SkillProjectGrid";
import { contentContainer } from "@/lib/layout";

// Sanity codifica le dimensioni originali nel ref dell'asset
// (`image-<hash>-<width>x<height>-<format>`): evita una query aggiuntiva per
// riservare lo spazio corretto e prevenire il layout shift al caricamento.
function imageDimensions(ref: string | undefined): { width: number; height: number } | null {
  const match = ref?.match(/-(\d+)x(\d+)-/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await client.fetch(projectBySlugQuery, { slug });
  if (!project) notFound();

  type NextCard = {
    _id: string;
    title: string;
    slug: { current: string };
    category?: { _id: string; title: string };
    thumbnailImage?: object;
  };
  const nextRaw = await client.fetch(nextProjectsQuery, {
    orderRank: project.orderRank ?? "",
    slug,
  });
  // Unisci "after" + "wrap", dedup per _id, prendi i primi 3
  const seen = new Set<string>();
  const nextProjects: NextCard[] = [
    ...(nextRaw?.after ?? []),
    ...(nextRaw?.wrap ?? []),
  ]
    .filter((p: NextCard) => (seen.has(p._id) ? false : (seen.add(p._id), true)))
    .slice(0, 3);

  return (
    <PageLoader>
    <main style={{ position: "relative", minHeight: "100vh", color: "#fff" }}>

      {/* Navbar condivisa (stessa di home) */}
      <Navbar />

      {/* Sfondo con sola luce che segue il cursore — CSS, non WebGL: era un
          contesto three.js intero solo per una pointlight su un piano. */}
      <HeroAmbientLight color={project.sceneLightColor} />

      {/* Contenuto sopra il canvas */}
      <div style={{ position: "relative", zIndex: 1 }}>

      {/* Hero */}
      <section style={{
        ...contentContainer,
        paddingTop: "8rem",
        paddingBottom: "4rem",
      }}>
        {/* Due colonne solo da desktop: sotto, la colonna di testo da 520px
            lascia all'immagine uno spazio troppo stretto per il suo 4:3. */}
        <style>{`
          @media (min-width: 1024px) {
            .hero-grid { display: grid !important; grid-template-columns: minmax(0, 520px) 1fr !important; gap: 3rem !important; align-items: start !important; }
          }
        `}</style>
        <div className="hero-grid" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Sinistra — testi */}
          <div>
            <p style={{
              fontSize: "0.65rem", letterSpacing: "0.35em", color: "#00f5ff",
              textTransform: "uppercase", marginBottom: "1rem",
            }}>
              {project.category?.title}
            </p>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              lineHeight: 1.1, marginBottom: "1.5rem",
            }}>
              {project.title}
            </h1>
            {project.categories?.length > 0 && (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                {project.categories.map((cat: { _id: string; title: string }) => (
                  <span key={cat._id} style={{
                    fontSize: "0.65rem", letterSpacing: "0.2em",
                    color: "#ffffff55", textTransform: "uppercase",
                  }}>
                    {cat.title}
                  </span>
                ))}
              </div>
            )}
            {project.description && (
              <p style={{
                fontSize: "0.9rem", lineHeight: 1.8, color: "#ffffffbb",
                maxWidth: "480px",
                whiteSpace: "pre-line",
              }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Destra — hero media */}
          <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#0d0030" }}>
            {project.heroType === "photo" && project.heroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlFor(project.heroImage).width(1200).auto("format").quality(75).url()}
                alt={project.title}
                width={1200}
                height={900}
                fetchPriority="high"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            {project.heroType === "iframe" && project.heroIframeUrl && (
              <iframe
                src={project.heroIframeUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
                allowFullScreen
              />
            )}
          </div>
        </div>
      </section>

      {/* Lista immagini dettaglio progetto — impilate */}
      {project.listaImmaginiDettaglioProgetto?.length > 0 && (
        <section style={{
          ...contentContainer,
          paddingTop: "2rem",
          paddingBottom: "4rem",
          display: "flex",
          flexDirection: "column",
          gap: "75px",
        }}>
          {project.listaImmaginiDettaglioProgetto.map((img: { _key: string; caption?: string; asset?: { _ref?: string } }, i: number) => {
            const dims = imageDimensions(img.asset?._ref) ?? { width: 1920, height: 1080 };
            return (
            <figure key={(img._key as string) ?? i} style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlFor(img as object).width(1920).auto("format").quality(75).url()}
                alt={img.caption ?? ""}
                width={dims.width}
                height={dims.height}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              {img.caption && (
                <figcaption style={{
                  marginTop: "0.6rem", fontSize: "0.7rem", letterSpacing: "0.1em",
                  color: "#ffffff66", textTransform: "uppercase",
                }}>
                  {img.caption}
                </figcaption>
              )}
            </figure>
            );
          })}
        </section>
      )}

      {/* Guarda il prossimo progetto — stessa griglia/carosello delle skill */}
      {nextProjects.length > 0 && (
        <section style={{ paddingTop: "3rem", paddingBottom: "6rem" }}>
          {/* Stesso stile degli altri label brevi del sito (footer, "scroll
              to explore"): Barlow 400 a 16px — 12px sotto i 768px via
              `.section-label` — spaziatura 0.3em, testo come scritto. */}
          <p className="section-label" style={{
            ...contentContainer,
            fontSize: "16px", textAlign: "center",
            fontFamily: "var(--font-barlow), sans-serif", fontWeight: 400,
            letterSpacing: "0.3em", lineHeight: 1.2,
            color: "#00f5ff", marginBottom: "2.5rem",
          }}>
            Guarda il prossimo progetto
          </p>
          <SkillProjectGrid projects={nextProjects} showCategory />
        </section>
      )}

      <Footer />
      </div>
    </main>
    </PageLoader>
  );
}
