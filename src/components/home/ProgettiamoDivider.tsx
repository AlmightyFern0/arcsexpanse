"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { contentContainer } from "@/lib/layout";

gsap.registerPlugin(ScrollTrigger);

export default function ProgettiamoDivider() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef   = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

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

    const t1 = gsap.fromTo(
      title,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reset",
        },
      }
    );

    const t2 = gsap.fromTo(
      subtitle,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        delay: 0.25,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reset",
        },
      }
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
        // Spazio ridotto (prima minHeight 80vh centrato): il blocco sta piu'
        // vicino all'esperienza Expanse che segue.
        paddingTop: "8rem",
        paddingBottom: "3rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...contentContainer,
      }}
    >
      <h2
        ref={titleRef}
        className="progettiamo-title"
        style={{
          fontSize: "62px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#ffffff",
          textTransform: "uppercase",
          lineHeight: 1.2,
          marginBottom: "1.5rem",
          opacity: 0, // parte invisibile, GSAP la porta a 1
        }}
      >
        {/* Lo spazio prima del <br> tiene separate le parole nel nome
            accessibile ("MONDI CHE", non "MONDICHE"). */}
        PROGETTIAMO MONDI{" "}
        <br />
        CHE NON ESISTONO ANCORA
      </h2>

      <p
        ref={subtitleRef}
        className="progettiamo-sub"
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
        AMBIENTI DIGITALI, ESPERIENZE IMMERSIVE E VISIONI 3D PENSATE PER ESSERE OSSERVATE E ATTRAVERSATE
      </p>
    </section>
  );
}
