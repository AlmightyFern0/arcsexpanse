"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollPageTo } from "@/lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollHint() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const tween = gsap.fromTo(
      wrap,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "power1.out",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "150 top",
          scrub: true,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const scrollToNext = () => {
    scrollPageTo(window.innerHeight);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        bottom: "2rem",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      <p
        className="hero-scroll"
        style={{
          fontSize: "16px",
          fontWeight: 400,
          fontFamily: "var(--font-barlow), sans-serif",
          letterSpacing: "0.3em",
          color: "#00F5FF",
          textTransform: "lowercase",
          textAlign: "center",
          lineHeight: 1.8,
          margin: 0,
        }}
      >
        scroll to explore
      </p>
      <button
        onClick={scrollToNext}
        aria-label="Scorri per esplorare"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          minWidth: "44px",
          minHeight: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#00F5FF",
          fontSize: "16px",
          lineHeight: 1,
        }}
      >
        ↓
      </button>
    </div>
  );
}
