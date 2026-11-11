"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import SplineStage, {
  SKILL_GROUPS,
  SKILLS_SCENE_URL,
  type SplineStageHandle,
} from "@/components/spline/SplineStage";
import { useSplineSlots } from "@/hooks/useSplineSlots";
import { SPLINE_ENABLED } from "@/lib/featureFlags";
import { useCenteredSlot } from "@/hooks/useCenteredSlot";
import { contentContainer } from "@/lib/layout";
import { skillProjectHref } from "@/lib/skillProjects";
import { isMobileViewport } from "@/lib/renderQuality";
import SkillHoverCard, { SKILL_CARD_MAX_WIDTH, SKILL_CARD_TEXT_STYLE } from "@/components/home/SkillHoverCard";


// Riduzione della risoluzione di rendering: il canvas nasce piu' piccolo e
// viene riportato a dimensione piena via CSS, cioe' meno pixel da riempire. E'
// l'unica leva disponibile, perche' il renderer di Spline non espone il pixel
// ratio: rende sempre a `devicePixelRatio` pieno.
//
// ~1.5 pixel reali per pixel CSS: sotto, la sgranatura si vede.
const MOBILE_TARGET_DENSITY = 1.5;

// Tetto assoluto sui pixel del framebuffer Spline, uguale per tutti.
//
// Prima il fattore lo sceglieva la classe di hardware (`isLowVramGpu`), che
// legge la stringa della GPU da `WEBGL_debug_renderer_info`. Su Safari quella
// estensione non c'e': la sonda tornava stringa vuota, il test AMD falliva e la
// protezione si spegneva in silenzio proprio sulle macchine che doveva
// proteggere — gli iMac 5K Intel, dove lo stage a densita' piena vale ~20 Mpx.
//
// Un tetto uguale per tutti non ha niente da riconoscere, quindi non ha niente
// da sbagliare. Chi ci sta sotto non perde nulla: `downscale` resta 1.
//
// Il valore e' da tarare sul campo: e' la soglia che le Radeon Pro dei Mac 2019
// reggono, e non la conosciamo ancora. Meglio partire stretti.
const MAX_STAGE_PIXELS = 4_000_000;

// Lo stage e' alto quanto la griglia, non quanto il viewport: se la misura
// arrivasse prima che le card siano a posto, sottostimare l'altezza vorrebbe
// dire un buffer piu' grande del previsto. Sotto il `minHeight` della sezione
// non si scende.
const MIN_STAGE_HEIGHT = 1217;

/** Fattore di riduzione del viewer, da due vincoli: il tetto di densita' su
 * mobile e il tetto assoluto di pixel, valido ovunque. Vince il piu' severo. */
function stageDownscale(isMobileDevice: boolean, stageHeight: number): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;

  const density = isMobileDevice
    ? Math.min(2, Math.max(1, dpr / MOBILE_TARGET_DENSITY))
    : 1;

  // Lo stage e' `100vw` per l'altezza della griglia. `downscale` divide
  // entrambi i lati, quindi i pixel calano col suo quadrato.
  const width = window.innerWidth || 1;
  const height = Math.max(stageHeight, MIN_STAGE_HEIGHT);
  const budget = Math.sqrt((width * height * dpr * dpr) / MAX_STAGE_PIXELS);

  return Math.max(1, density, budget);
}

// Scala di ogni artwork a `downscale` 1: il valore effettivo lo divide
// `SkillsSection`, perche' ridurre la risoluzione ingrandisce dello stesso
// fattore. Tenerle accoppiate a mano rompeva il dimensionamento.
const SKILLS_SCALE_UNIT = 0.4;

const SKILLS_SLUGS = [
  "product-conception",
  "ai-content-design",
  "virtual-immersive-worlds",
  "marketing-visualization",
  "3d-direction",
  "physical-experiences",
];

export interface Skill {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  splineUrl?: string;
  tags?: string;
  category?: { _id: string; title: string; slug: { current: string } };
  categories?: { _id: string; title: string; slug: { current: string } }[];
}

function SkillCard({ skill, isMobile = false, loading = false, active = false, onHoverChange, slotRef, descriptionRef }: { skill: Skill; isMobile?: boolean; loading?: boolean; active?: boolean; onHoverChange?: (id: string | null) => void; slotRef?: (el: HTMLDivElement | null) => void; descriptionRef?: (el: HTMLDivElement | null) => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reservedRef = useRef<HTMLDivElement | null>(null);
  const cardId = `skill-card-${skill.slug.current}`;
  const hasDescription = Boolean(skill.description);

  const href = skillProjectHref(skill.slug.current);

  const style: CSSProperties = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "center",
    gap: isMobile ? "1rem" : "1.5rem",
    flex: "0 0 auto",
    width: isMobile ? "100%" : "clamp(280px, 38vw, 560px)",
    textAlign: isMobile ? "center" : "left",
    color: "inherit",
    textDecoration: "none",
  };
  const interaction = {
    className: "skill-item",
    "aria-describedby": active && hasDescription ? cardId : undefined,
    onMouseEnter: () => onHoverChange?.(skill.slug.current),
    onMouseLeave: () => onHoverChange?.(null),
    onFocus: () => onHoverChange?.(skill.slug.current),
    onBlur: () => onHoverChange?.(null),
    style,
  };

  const content = (
    <>
      {/* Il box resta vuoto: il visivo arriva dalla scena unica dietro la
          griglia, centrata su questo rettangolo. Finche' quella scena non e'
          a posto il box mostra un'attesa: scambiando desktop/mobile si
          ricarica tutto da capo, e senza un segnale qui restano solo sei
          rettangoli vuoti per qualche secondo. */}
      <div
        ref={slotRef}
        style={{
          width: 242,
          height: 242,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          aria-hidden
          className="skill-slot-spinner"
          style={{ opacity: loading ? 1 : 0, transition: "opacity 0.4s ease" }}
        />
      </div>

      <div style={{ paddingTop: 0 }}>
        <h3
          ref={titleRef}
          style={{
            fontSize: isMobile ? "1.25rem" : "clamp(1rem, 1.8vw, 1.5rem)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#00F5FF",
            textTransform: "uppercase",
            whiteSpace: "pre-line",
            lineHeight: 1.15,
            marginBottom: "0.6rem",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          {skill.title}
        </h3>
      </div>

      {/* Su mobile la card non puo' galleggiare sopra la skill successiva: il
          trigger e' lo scroll, e per leggerla bisogna che stia tutta a schermo
          senza coprire niente. Le si tiene quindi il posto in flusso con una
          sagoma invisibile dello stesso testo, cosi' la distanza fra una skill
          e l'altra segue la lunghezza della descrizione, e lo spazio c'e'
          sempre: accendere la card non sposta gli slot della scena Spline. */}
      {hasDescription && isMobile && (
        <div
          ref={(el) => {
            reservedRef.current = el;
            descriptionRef?.(el);
          }}
          aria-hidden
          className="skill-card"
          style={{
            visibility: "hidden",
            width: "max-content",
            maxWidth: `min(${SKILL_CARD_MAX_WIDTH}px, 100%)`,
            textAlign: "left",
          }}
        >
          <p className="skill-card__text" style={SKILL_CARD_TEXT_STYLE}>
            {skill.description}
          </p>
        </div>
      )}

      {hasDescription && (
        <SkillHoverCard
          id={cardId}
          open={active}
          text={skill.description!}
          anchorRef={isMobile ? reservedRef : titleRef}
          centered={isMobile}
          placement={isMobile ? "over" : "below"}
        />
      )}
    </>
  );

  // Zona hover unica su tutta la card (icona + gap + etichetta): con due
  // zone separate il mouse "usciva" nel gap CSS fra le due prima di entrare
  // nella successiva, causando un exit+enter lampo che si vedeva come un
  // flash dell'animazione ogni volta che il cursore attraversava lo spazio.
  //
  // La card porta al progetto che rappresenta la skill (`skillProjects`); il
  // focus da tastiera vale come hover. Senza progetto associato resta una card
  // di sola descrizione.
  if (href) {
    return (
      <Link href={href} {...interaction}>
        {content}
      </Link>
    );
  }
  return (
    <div tabIndex={hasDescription ? 0 : undefined} {...interaction}>
      {content}
    </div>
  );
}

interface SkillsSectionProps {
  skills: Skill[];
}

export default function SkillsSection({ skills }: SkillsSectionProps) {
  const isMobile = useIsMobile();

  // Risoluzione del viewer, decisa al primo caricamento e mai piu' toccata:
  // cambiarla ricrea il viewer, e quella riallocazione di memoria video e' il
  // sospetto principale del riavvio sull'iMac del cliente.
  //
  // Non `isMobile`: l'hook dice `false` al primo render per non divergere dal
  // server, e qui il valore sbagliato costerebbe una scena caricata a vuoto.
  const [downscale, setDownscale] = useState<number | null>(null);
  // La griglia si dispone da sola: lo stage e' in `position: absolute`, quindi
  // finche' `downscale` e' `null` e il viewer non e' montato l'altezza del
  // contenitore e' gia' quella definitiva delle card. La si misura qui e il
  // viewer nasce con il valore giusto, senza doverlo cambiare dopo.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SPLINE_ENABLED) return;
    const height = gridRef.current?.getBoundingClientRect().height ?? 0;
    setDownscale(stageDownscale(isMobileViewport(), height));
  }, []);
  const stageRef = useRef<SplineStageHandle>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Falso finche' gli artwork non sono a schermo.
  const [stageReady, setStageReady] = useState(false);

  // Identita' stabile: finisce nelle dipendenze di `applyLayout` dentro lo stage.
  const stageScales = useMemo(() => {
    const value = SKILLS_SCALE_UNIT / (downscale ?? 1);
    return Object.fromEntries(SKILLS_SLUGS.map((slug) => [slug, value]));
  }, [downscale]);

  useEffect(() => {
    stageRef.current?.setHovered(hoveredId);
  }, [hoveredId]);

  // Box icona di ogni card, per slug: sono i bersagli su cui centrare il 3D.
  const { registerSlot, pushLayout, elements: slotEls } = useSplineSlots(stageRef);

  // Spazio riservato alla descrizione di ogni skill su mobile, per slug.
  const descriptionEls = useRef(new Map<string, HTMLElement>());
  const registerDescription = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) descriptionEls.current.set(key, el);
      else descriptionEls.current.delete(key);
    },
    []
  );

  // Mobile non ha hover: la skill si attiva passando per il centro schermo,
  // ma solo quando icona 3D e descrizione sono tutte e due a schermo.
  useCenteredSlot(slotEls, isMobile, setHoveredId, descriptionEls);

  // Chunk into rows of 2; odd rows (1, 3, …) get 80px right shift
  const rows: Skill[][] = [];
  for (let i = 0; i < skills.length; i += 2) {
    rows.push(skills.slice(i, i + 2));
  }

  return (
    <section
      className="relative z-10"
      style={{
        minHeight: "1217px",
        paddingTop: "calc(8.75vw + 5rem)",
      }}
    >
      <p
        className="skill-label"
        style={{
          textAlign: "center",
          fontSize: "3rem",
          fontWeight: 400,
          fontFamily: "var(--font-barlow), sans-serif",
          letterSpacing: "0.3em",
          color: "#00F5FF",
          marginBottom: "5rem",
        }}
      >
        le nostre skill
      </p>

      <div
        ref={gridRef}
        style={{
          ...contentContainer,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "3rem" : "32px",
        }}
      >
        {SPLINE_ENABLED && downscale !== null && (
          // Full-bleed: largo quanto lo schermo (non il content container da
          // 1264px), alto quanto la griglia — così il canvas scorre insieme
          // alle card e il loro rapporto non cambia mai durante lo scroll.
          //
          // La dimensione reale del buffer e' questa larghezza per questa
          // altezza per il DPR, il tutto diviso `downscale`: e' su questo che
          // `MAX_STAGE_PIXELS` mette il tetto.
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "100vw", transform: "translateX(-50%)", pointerEvents: "none" }}>
            <SplineStage
              ref={stageRef}
              sceneUrl={SKILLS_SCENE_URL}
              groups={SKILL_GROUPS}
              scales={stageScales}
              downscale={downscale}
              // Lo splash aspetta solo la scena three.js dell'hero. Aspettare
              // anche questa non ha più senso da quando si costruisce
              // all'avvicinarsi della sezione: lo splash resterebbe su finché
              // l'utente non scrolla, cioè per sempre se non scrolla.
              blocksSplash={false}
              onNeedsMeasure={pushLayout}
              onReadyChange={setStageReady}
            />
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: isMobile ? "3rem" : "32px" }}>
          {isMobile
            ? skills.map((skill) => (
                <SkillCard
                  key={skill._id}
                  skill={skill}
                  isMobile
                  loading={SPLINE_ENABLED && !stageReady}
                  active={hoveredId === skill.slug.current}
                  slotRef={registerSlot(skill.slug.current)}
                  descriptionRef={registerDescription(skill.slug.current)}
                />
              ))
            : rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  style={{
                    display: "flex",
                    gap: "4rem",
                    justifyContent: "center",
                    paddingLeft: rowIndex % 2 === 1 ? "clamp(0px, 10vw, 200px)" : "0px",
                    paddingRight: rowIndex % 2 === 0 ? "clamp(0px, 10vw, 200px)" : "0px",
                  }}
                >
                  {row.map((skill) => (
                    <SkillCard
                      key={skill._id}
                      skill={skill}
                      loading={SPLINE_ENABLED && !stageReady}
                      active={hoveredId === skill.slug.current}
                      onHoverChange={setHoveredId}
                      slotRef={registerSlot(skill.slug.current)}
                    />
                  ))}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
