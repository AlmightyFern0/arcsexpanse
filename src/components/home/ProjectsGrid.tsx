"use client";

import { useRef, useState, useEffect, useId } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { urlFor } from "@/sanity/lib/image";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useHoverVideo } from "@/hooks/useHoverVideo";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  _id: string;
  title: string;
  slug: { current: string };
  category?: { _id: string; title: string; slug: { current: string } };
  gridSize: "one-third" | "two-thirds" | "full";
  diagonalLeft?: "none" | "slash" | "backslash";
  diagonalRight?: "none" | "slash" | "backslash";
  thumbnailImage?: object;
  thumbnailVideoUrl?: string;
  orderRank?: string;
  offsetY?: number;
  layer?: number;
}

const LEFT_MARGIN  = "10.42vw";
const RIGHT_MARGIN = "5.21vw";
const FULL_MARGIN  = "2vw";

function cardWidthVw(size: string): string {
  switch (size) {
    case "one-third":  return "41.93vw";
    case "two-thirds": return "56.83vw";
    case "full":       return `calc(100vw - 2 * ${FULL_MARGIN})`;
    default:           return "41.93vw";
  }
}

function cardLeftPos(size: string, slotIndex: number): string {
  if (size === "full") return FULL_MARGIN;
  if (slotIndex === 0) return LEFT_MARGIN;
  const w = size === "one-third" ? "41.93vw" : "56.83vw";
  return `calc(100vw - ${RIGHT_MARGIN} - ${w})`;
}

const D = "3vw";

// Poligono a 4 punti con diagonali indipendenti su sinistra e destra
function buildClipPath(left: string, right: string): string | undefined {
  const hasLeft  = left  !== "none";
  const hasRight = right !== "none";
  if (!hasLeft && !hasRight) return undefined;

  // Top-left point: shifted right if left=slash, unchanged otherwise
  const tl = left  === "slash"     ? `${D} 0`           : "0 0";
  // Top-right point: shifted left if right=backslash, unchanged otherwise
  const tr = right === "backslash" ? `calc(100% - ${D}) 0`  : "100% 0";
  // Bottom-right point: shifted left if right=slash, unchanged otherwise
  const br = right === "slash"     ? `calc(100% - ${D}) 100%` : "100% 100%";
  // Bottom-left point: shifted right if left=backslash, unchanged otherwise
  const bl = left  === "backslash" ? `${D} 100%`        : "0 100%";

  return `polygon(${tl}, ${tr}, ${br}, ${bl})`;
}

// Misure base delle card, per taglio — full 1920×560, due-terzi 1090×560,
// un-terzo 800×560: la stessa altezza per tutte, cambia solo la larghezza.
//
// Fonte unica per due cose che devono combaciare: la forma della cornice
// (CSS `aspect-ratio`; l'altezza la deduce il browser dalla larghezza vw già
// impostata da `cardWidthVw`) e il ritaglio che chiediamo a Sanity. Se le due
// forme divergessero, il punto focale scelto dal cliente finirebbe fuori
// centro.
const CARD_SIZE: Record<string, { w: number; h: number }> = {
  "full":       { w: 1920, h: 560 },
  "two-thirds": { w: 1090, h: 560 },
  "one-third":  { w: 800,  h: 560 },
};

function cardSize(size: string): { w: number; h: number } {
  return CARD_SIZE[size] ?? CARD_SIZE["one-third"];
}

function cardAspectRatio(size: string): string {
  const { w, h } = cardSize(size);
  return `${w} / ${h}`;
}

// Il contenitore di riga sta in flusso mentre le card al suo interno sono
// `position: absolute` — senza un'altezza esplicita qui la riga
// collasserebbe a zero. 560/1920 = 29.1667vw è l'altezza base espressa come
// frazione dello stesso schermo di riferimento delle tre card: vale per tutte,
// non serve differenziare full da due-terzi/un-terzo.
const CARD_H = "clamp(220px, 29.1667vw, 566px)";

// Mobile: il rapporto 1920:560 della card "full" darebbe ~110px di altezza a
// piena larghezza telefono — illeggibile. Si usa invece 800:560, il taglio
// più "alto" dei tre: è anche la safe area per gli export — il soggetto
// centrato in quella zona sopravvive a qualunque crop, dal mobile alla card
// intera.
const MOBILE_SIZE = CARD_SIZE["one-third"];
const MOBILE_ASPECT = `${MOBILE_SIZE.w} / ${MOBILE_SIZE.h}`;
const MOBILE_SLASH = "8vw"; // spostamento orizzontale del taglio diagonale su mobile
// "/" : lati verticali inclinati (sx+dx), top/bottom dritti — parallelogramma
const MOBILE_SLASH_CLIP = `polygon(${MOBILE_SLASH} 0, 100% 0, calc(100% - ${MOBILE_SLASH}) 100%, 0 100%)`;

// Spazio verticale fra le righe.
const ROW_GAP = "clamp(7rem, 4rem + 9vw, 13rem)";

// Corsa della parallasse, come frazione del gap fra righe.
const PARALLAX_GAP_RATIO = 0.45;

function ProjectCard({
  project,
  slotIndex,
  rowLength,
  isMobile = false,
}: { project: Project; slotIndex: number; rowLength: number; isMobile?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { videoRef, play, stop } = useHoverVideo();
  const wrapRef  = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const categoryId = `${uid}-cat`;

  // Ritaglio fatto da Sanity, già nella forma esatta della cornice (vedi
  // `CARD_SIZE`) e centrato sul punto focale che il cliente sceglie nello
  // Studio. Senza punto focale si centra sull'immagine: identico al `cover`
  // centrato di prima. Misura per taglio: due-terzi prendeva 800px come
  // un-terzo pur essendo renderizzata a 1090, e si vedeva meno nitida.
  const thumb = isMobile ? MOBILE_SIZE : cardSize(project.gridSize);
  const thumbUrl = project.thumbnailImage
    ? urlFor(project.thumbnailImage).width(thumb.w).height(thumb.h).auto("format").quality(75).url()
    : null;

  const clipPath = buildClipPath(
    project.diagonalLeft  ?? "none",
    project.diagonalRight ?? "none",
  );

  // Solo offset verso il basso: rowHeight() budgetizza solo quelli.
  const offsetY = Math.max(0, project.offsetY ?? 0);
  const layer   = project.layer ?? 1;

  useEffect(() => {
    if (isMobile) return;        // niente parallasse su mobile
    if (rowLength < 2) return;   // card sola nella riga: resta ferma
    const el = wrapRef.current;
    if (!el) return;

    // Il gap si legge dal contenitore, unica fonte.
    const container = el.parentElement?.parentElement;
    const gapPx = container ? parseFloat(getComputedStyle(container).rowGap) || 0 : 0;

    const travel = gapPx * PARALLAX_GAP_RATIO;
    // Slot 0 sale, slot 1 scende.
    const direction = slotIndex === 0 ? -1 : 1;
    const half = (travel * direction) / 2;

    const tween = gsap.fromTo(
      el,
      { y: -half },
      {
        y: half,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [isMobile, slotIndex, rowLength]);

  const handleEnter = () => {
    setHovered(true);
    play();
  };
  const handleLeave = () => {
    setHovered(false);
    stop();
  };

  return (
    <div
      ref={wrapRef}
      style={
        isMobile
          ? {
              position: "relative",
              zIndex: hovered ? 999 : 1,
              // card con "/" rientrate 35px per lato, le altre full-width
              margin: slotIndex % 2 === 1 ? "0 35px" : 0,
            }
          : {
              position: "absolute",
              width: cardWidthVw(project.gridSize),
              left: cardLeftPos(project.gridSize, slotIndex),
              top: `${offsetY}px`,
              zIndex: hovered ? 999 : layer,
            }
      }
    >
      {/* clipPath on inner div so the GPU-composited outer layer stays clean */}
      <div style={{
        clipPath: isMobile
          ? (slotIndex % 2 === 1 ? MOBILE_SLASH_CLIP : undefined)  // uno sì uno no: "/"
          : clipPath,
        width: "100%",
        height: "100%",
      }}>
      {/* Nome del link = titolo (una sola volta: l'immagine e' decorativa),
          descrizione = categoria. Il focus da tastiera vale come hover, e
          l'anello e' disegnato all'interno perche' il `clipPath` sopra
          taglierebbe quello esterno. */}
      <Link
        href={`/projects/${project.slug.current}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        aria-labelledby={titleId}
        aria-describedby={project.category?.title ? categoryId : undefined}
        className="focus-inset"
        style={{ textDecoration: "none", display: "block" }}
      >
        <div style={{
          position: "relative",
          width: "100%",
          aspectRatio: isMobile ? MOBILE_ASPECT : cardAspectRatio(project.gridSize),
          overflow: "hidden",
          background: "#0d0030",
          cursor: "pointer",
        }}>

          {thumbUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                transition: "opacity 0.5s ease",
                opacity: hovered ? (project.thumbnailVideoUrl ? 0 : 0.35) : 1,
              }}
            />
          )}

          {/* Su mobile non esiste hover, quindi questo video non verrà mai
              riprodotto: montarlo significherebbe solo far scaricare al
              telefono un file che nessuno vedrà — e i video del cliente
              arrivano a decine di MB. `preload="none"` sul desktop evita che
              il browser inizi a scaricarli tutti al caricamento della pagina. */}
          {!isMobile && project.thumbnailVideoUrl && (
            <video
              ref={videoRef}
              src={project.thumbnailVideoUrl}
              preload="none"
              muted loop playsInline
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            />
          )}

          {/* Velo a 0.65: con testo bianco e categoria ciano resta sopra
              4,5:1 anche su un'immagine bianca. */}
          <div className="home-card-overlay" style={{
            position: "absolute", inset: 0,
            background: "rgba(4, 0, 20, 0.65)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }} />

          <div className="home-card-overlay" style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            pointerEvents: "none",
            textAlign: "center",
            padding: "1.5rem",
          }}>
            <div>
              {project.category?.title && (
                <p id={categoryId} style={{
                  fontSize: "max(12px, 0.75rem)",
                  letterSpacing: "0.3em",
                  color: "#00f5ff",
                  textTransform: "uppercase",
                  marginBottom: "0.7rem",
                }}>
                  {project.category.title}
                </p>
              )}
              <h3 id={titleId} style={{
                fontSize: "clamp(0.9rem, 2.2vw, 1.6rem)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ffffff",
                lineHeight: 1.2,
              }}>
                {project.title}
              </h3>
            </div>
          </div>
        </div>
      </Link>
      </div>
    </div>
  );
}

function sizeSlots(size: string): number {
  if (size === "full") return 3;
  if (size === "two-thirds") return 2;
  return 1;
}

// Altezza riga: tutte le card condividono la stessa altezza base (vedi
// `cardAspectRatio`), quindi basta CARD_H più l'eventuale offsetY massimo.
function rowHeight(rowProjects: Project[]): string {
  const maxOffset = Math.max(0, ...rowProjects.map((p) => p.offsetY ?? 0));
  return maxOffset > 0 ? `calc(${CARD_H} + ${maxOffset}px)` : CARD_H;
}

function buildRows(projects: Project[]): Project[][] {
  const rows: Project[][] = [];
  let current: Project[] = [];
  let used = 0;

  for (const p of projects) {
    const slots = sizeSlots(p.gridSize);
    if (used + slots > 3 || (p.gridSize === "full" && current.length > 0)) {
      if (current.length) rows.push(current);
      current = [p];
      used = slots;
    } else {
      current.push(p);
      used += slots;
      if (used >= 3) {
        rows.push(current);
        current = [];
        used = 0;
      }
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const isMobile = useIsMobile();

  if (!projects.length) return null;

  const rows = buildRows(projects);

  return (
    // Bottom padding uses ROW_GAP so the space after the last row matches the
    // rhythm between rows — and, like that gap, it absorbs the parallax drift
    // of the final row instead of letting it crowd the next section.
    <section style={{ position: "relative", zIndex: 1, padding: `5rem 0 ${ROW_GAP}` }}>
      {/* Su touch non esiste hover: titolo e categoria sempre visibili.
          `!important` perche' l'opacita' dell'overlay e' uno stile inline. */}
      <style>{`
        @media (hover: none) {
          .home-card-overlay { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {isMobile ? (
        // Mobile: colonna full-width, niente margini/parallasse/diagonali
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {projects.map((p, i) => (
            <ProjectCard key={p._id} project={p} slotIndex={i} rowLength={1} isMobile />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
          {rows.map((rowProjects, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                position: "relative",
                width: "100%",
                height: rowHeight(rowProjects),
              }}
            >
              {rowProjects.map((p, slotIdx) => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  slotIndex={slotIdx}
                  rowLength={rowProjects.length}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
