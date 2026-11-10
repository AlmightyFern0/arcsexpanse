"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/FilterChip";
import ProjectCard from "@/components/projects/ProjectCard";

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface WorksProject {
  _id: string;
  title: string;
  slug: { current: string };
  category?: Category;
  categories?: Category[];
  thumbnailImage?: object;
  thumbnailVideoUrl?: string;
}

interface WorksGridProps {
  projects: WorksProject[];
  categories: Category[];
}

export default function WorksGrid({ projects, categories }: WorksGridProps) {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const visible =
    activeIds.size === 0
      ? projects
      : projects.filter(
          (p) =>
            (p.categories?.some((c) => activeIds.has(c._id)) ?? false) ||
            (p.category ? activeIds.has(p.category._id) : false)
        );

  return (
    <div>
      {/* Label */}
      <p style={{
        fontSize: "16px",
        fontFamily: "var(--font-barlow), sans-serif",
        fontWeight: 400,
        letterSpacing: "0.25em",
        color: "rgba(255,255,255,0.45)",
        marginBottom: "1rem",
      }}>
        Scegli la categoria da esplorare
      </p>

      {/* Filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "4rem" }}>
        {categories.map((cat) => (
          <FilterChip
            key={cat._id}
            label={cat.title}
            active={activeIds.has(cat._id)}
            onClick={() => toggle(cat._id)}
          />
        ))}
      </div>

      {/* Grid — 1 colonna su mobile, 2 su tablet, 3 da desktop */}
      <style>{`
        .works-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 2.5rem 2rem;
        }
        @media (min-width: 640px) {
          .works-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .works-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3rem 2rem; }
        }
      `}</style>
      <div className="works-grid">
        {visible.map((project) => (
          <ProjectCard key={project._id} project={project} showCategory />
        ))}
      </div>
    </div>
  );
}
