"use client";

import { useEffect, useRef } from "react";

// Portale circolare su canvas 2D: immagine ritagliata nel cerchio con
// vignettatura, bordo luminoso e particelle in orbita. Il movimento sta tutto
// sul bordo. In hover accelera la rotazione e zooma leggermente.

const CYAN   = "0, 245, 255";   // accento del tema
const VIOLET = "68, 25, 174";   // viola della sezione skill
const VOID   = "8, 0, 26";      // fondo scena

const RIM_PARTICLES = 170;

const BASE_SPIN       = 0.18;  // rad/s a riposo
const HOVER_SPIN_MULT = 7;     // scatto netto in hover: è il segnale "cliccami"

// Rotazione reattiva, zoom e bagliore morbidi.
const SPIN_EASE   = 0.32;
const VISUAL_EASE = 0.09;

// Lerp indipendente dal frame rate.
const lerpK = (ease: number, dt: number) => 1 - Math.pow(1 - ease, dt * 60);

type RimParticle = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  drift: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeRimParticles(): RimParticle[] {
  return Array.from({ length: RIM_PARTICLES }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: rand(0.93, 1.1),
    speed: rand(0.6, 1.5),
    size: rand(0.6, 2.5),
    alpha: rand(0.25, 1),
    drift: rand(-0.03, 0.03),
  }));
}

// Interpola due colori "r, g, b" e restituisce una stringa rgba().
function mix(a: string, b: string, t: number, alpha: number): string {
  const pa = a.split(",").map(Number);
  const pb = b.split(",").map(Number);
  const k = Math.max(0, Math.min(1, t));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

export default function PortalCanvas({
  imageUrl,
  alt,
  activateOnCenter = false,
}: {
  imageUrl?: string;
  alt?: string;
  /** Attiva l'animazione quando il portale passa per il centro dello schermo,
   * invece che al passaggio del mouse. Serve su mobile, dove l'hover non
   * esiste: senza, l'animazione non partirebbe mai. */
  activateOnCenter?: boolean;
}) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef  = useRef(0);  // 0 = a riposo, 1 = hover pieno

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = wrap.clientWidth || 1;
      const nh = wrap.clientHeight || 1;
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Scrivere width/height rialloca il buffer del canvas, che e' in memoria
    // GPU: durante il trascinamento del bordo arriverebbe a ogni fotogramma. Si
    // ridimensiona a fermo, come gli altri canvas.
    const RESIZE_SETTLE_MS = 150;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, RESIZE_SETTLE_MS);
    });
    ro.observe(wrap);

    // Caricata a mano per ritagliarla nel cerchio sullo stesso canvas.
    let image: HTMLImageElement | null = null;
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => { image = img; };
    }

    const rim = makeRimParticles();
    let hover = 0;      // pilota zoom, bordo, dimensione particelle
    let spinHover = 0;  // pilota solo la velocità di rotazione

    const draw = (dt: number) => {
      const target = hoverRef.current;
      hover     += (target - hover)     * lerpK(VISUAL_EASE, dt);
      spinHover += (target - spinHover) * lerpK(SPIN_EASE, dt);
      const spin = BASE_SPIN * (1 + spinHover * (HOVER_SPIN_MULT - 1));

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      // Lascia spazio a particelle e bagliore.
      const r = Math.min(w, h) * 0.32 * (1 + hover * 0.05);

      // ---- interno del portale: immagine + vignettatura
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      if (image && image.naturalWidth > 0) {
        // "cover" del cerchio, con un filo di zoom in più mentre è in hover
        const scale =
          Math.max((r * 2) / image.naturalWidth, (r * 2) / image.naturalHeight) *
          (1 + hover * 0.06);
        const dw = image.naturalWidth * scale;
        const dh = image.naturalHeight * scale;
        ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = `rgb(${VOID})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // Vignettatura: dà profondità al varco.
      const vignette = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
      vignette.addColorStop(0, `rgba(${VOID}, 0)`);
      vignette.addColorStop(0.75, `rgba(${VOID}, 0.12)`);
      vignette.addColorStop(1, `rgba(${VOID}, 0.55)`);
      ctx.fillStyle = vignette;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      // ---- bordo luminoso
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${CYAN}, ${0.5 + hover * 0.5})`;
      ctx.lineWidth = 2 + hover * 1.6;
      ctx.shadowColor = `rgba(${CYAN}, 0.9)`;
      ctx.shadowBlur = 16 + hover * 28;
      ctx.stroke();
      ctx.stroke();  // seconda passata per il bloom
      ctx.restore();

      // ---- particelle in orbita sul bordo
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of rim) {
        p.angle += p.speed * spin * dt;
        p.radius += p.drift * dt;
        if (p.radius > 1.12 || p.radius < 0.9) p.drift *= -1;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(p.angle) * r * p.radius,
          cy + Math.sin(p.angle) * r * p.radius,
          p.size * (1 + hover * 0.45),
          0, Math.PI * 2
        );
        ctx.fillStyle = mix(CYAN, VIOLET, (p.radius - 0.9) * 2, p.alpha * (0.5 + hover * 0.5));
        ctx.fill();
      }
      ctx.restore();
    };

    // Reduced motion: un solo fotogramma, nessun loop.
    if (reduced) {
      draw(0);
      const t = setTimeout(() => draw(0), 400);  // ricattura un'immagine tardiva
      return () => { clearTimeout(t); ro.disconnect(); };
    }

    let active = true;
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; }, { threshold: 0 });
    io.observe(wrap);
    const onVisibility = () => { active = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);  // clamp dopo un tab-out
      last = now;
      if (!active) return;
      draw(dt);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      clearTimeout(resizeTimer);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [imageUrl]);

  // Stesso criterio usato per le scene Spline su mobile: attivo quando il
  // centro dell'elemento è vicino al centro del viewport.
  useEffect(() => {
    if (!activateOnCenter) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let raf = 0;
    const check = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
      // Mezza altezza come soglia: l'animazione sale mentre il portale entra
      // nella fascia centrale, invece di accendersi di scatto.
      hoverRef.current = distance < Math.max(rect.height / 2, 1) ? 1 : 0;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      hoverRef.current = 0;
    };
  }, [activateOnCenter]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => { if (!activateOnCenter) hoverRef.current = 1; }}
      onMouseLeave={() => { if (!activateOnCenter) hoverRef.current = 0; }}
      style={{ width: "100%", height: "100%", position: "relative" }}
      aria-label={alt}
      role={alt ? "img" : undefined}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
