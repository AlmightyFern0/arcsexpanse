"use client";

import { useState } from "react";
import Link from "next/link";
import { urlFor } from "@/sanity/lib/image";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useHoverVideo } from "@/hooks/useHoverVideo";

export interface ProjectCardCategory {
  _id: string;
  title: string;
}

export interface ProjectCardData {
  _id: string;
  title: string;
  slug: { current: string };
  category?: ProjectCardCategory;
  thumbnailImage?: object;
  thumbnailVideoUrl?: string;
}

interface ProjectCardProps {
  project: ProjectCardData;
  /** Etichetta della skill sopra il titolo. Spenta nelle pagine skill, dove
   *  sarebbe la stessa per tutte le card. */
  showCategory?: boolean;
}

// Forma della cornice, e insieme misura del ritaglio chiesto a Sanity: il
// punto focale scelto dal cliente nello Studio finisce al centro della card
// solo se il ritaglio ha già la forma della cornice. 800×760 = 400:380.
const THUMB = { w: 800, h: 760 };

/** Card progetto condivisa fra dettaglio progetto e /works.
 *  Hover: il video sostituisce l'immagine e la media zooma. Nessun testo in
 *  sovrimpressione — titolo e categoria stanno sempre sotto. */
export default function ProjectCard({ project, showCategory }: ProjectCardProps) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const { videoRef, play, stop } = useHoverVideo();

  const thumbUrl = project.thumbnailImage
    ? urlFor(project.thumbnailImage).width(THUMB.w).height(THUMB.h).auto("format").quality(75).url()
    : null;

  const handleEnter = () => {
    setHovered(true);
    play();
  };
  const handleLeave = () => {
    setHovered(false);
    stop();
  };

  const mediaStyle = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transition: "opacity 0.5s ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
    transform: hovered ? "scale(1.06)" : "scale(1)",
  };

  return (
    <Link
      href={`/projects/${project.slug.current}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${THUMB.w} / ${THUMB.h}`,
        background: "#1a0050",
        overflow: "hidden",
      }}>
        {thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={project.title}
            loading="lazy"
            decoding="async"
            style={{
              ...mediaStyle,
              opacity: hovered && project.thumbnailVideoUrl ? 0 : 1,
            }}
          />
        )}

        {/* Niente hover su mobile: il video non partirebbe mai, e scaricarlo
            sarebbe puro spreco. `preload="none"` impedisce al browser di
            iniziare a tirarli giù tutti al caricamento della pagina. */}
        {!isMobile && project.thumbnailVideoUrl && (
          <video
            ref={videoRef}
            src={project.thumbnailVideoUrl}
            preload="none"
            muted loop playsInline
            style={{ ...mediaStyle, opacity: hovered ? 1 : 0 }}
          />
        )}
      </div>

      <div style={{ padding: "0.9rem 0 0.5rem" }}>
        {showCategory && project.category?.title && (
          <p style={{
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            color: "#00f5ff",
            textTransform: "uppercase",
            marginBottom: "0.35rem",
          }}>
            {project.category.title}
          </p>
        )}
        <h3 style={{
          fontSize: "clamp(1.25rem, 3.2vw, 2rem)",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "#ffffff",
          lineHeight: 1.1,
        }}>
          {project.title}
        </h3>
      </div>
    </Link>
  );
}
