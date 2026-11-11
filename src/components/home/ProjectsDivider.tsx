"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { contentContainer } from "@/lib/layout";

gsap.registerPlugin(ScrollTrigger);

export default function ProjectsDivider() {
  const sectionRef  = useRef<HTMLElement>(null);
  const titleRef    = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  // Animazioni GSAP testo
  useEffect(() => {
    const section  = sectionRef.current;
    const title    = titleRef.current;
    const subtitle = subtitleRef.current;
    if (!section || !title || !subtitle) return;

    // Movimento ridotto: titoli subito visibili, nessuna animazione.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set([title, subtitle], { opacity: 1, y: 0 });
      return;
    }

    const t1 = gsap.fromTo(title,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 70%", once: true } }
    );
    const t2 = gsap.fromTo(subtitle,
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, delay: 0.2, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 70%", once: true } }
    );

    return () => {
      t1.scrollTrigger?.kill(); t1.kill();
      t2.scrollTrigger?.kill(); t2.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...contentContainer,
      }}
    >
      {/* Contenuto — HeroBackground fixed copre il bg */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2
          ref={titleRef}
          className="progetti-title"
          style={{
            fontSize: "62px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#ffffff",
            textTransform: "uppercase",
            lineHeight: 1.2,
            marginBottom: "1.5rem",
            opacity: 0,
          }}
        >
          {/* Spazio prima del <br>: vedi ProgettiamoDivider. */}
          OGNI PROGETTO{" "}
          <br />
          NASCE DA UN&apos;IDEA
        </h2>
        <p
          ref={subtitleRef}
          className="progetti-sub"
          style={{
            fontSize: "32px",
            fontWeight: 400,
            fontFamily: "var(--font-barlow), sans-serif",
            letterSpacing: "0.3em",
            color: "#00F5FF",
            textTransform: "uppercase",
            lineHeight: 1.8,
            opacity: 0,
          }}
        >
          QUESTE SONO QUELLE CHE ABBIAMO TRASFORMATO{" "}
          <br />
          IN AMBIENTI IMMERSIVI, ESPERIENZE DIGITALI E VISIONI CONCRETE.
        </p>
      </div>
    </section>
  );
}
