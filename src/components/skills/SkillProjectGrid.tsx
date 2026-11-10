"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { contentContainer, CONTENT_PADDING_X } from "@/lib/layout";
import ProjectCard, { type ProjectCardData } from "@/components/projects/ProjectCard";

export type SkillProject = ProjectCardData;

export default function SkillProjectGrid({
  projects,
  showCategory,
}: {
  projects: SkillProject[];
  /** Etichetta della skill sopra il titolo. Usata nel dettaglio progetto. */
  showCategory?: boolean;
}) {
  const isMobile = useIsMobile();

  if (projects.length === 0) return null;

  if (isMobile) {
    return (
      <>
        <style>{`
          .skill-project-carousel::-webkit-scrollbar { display: none; }
          .skill-project-carousel { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div
          className="skill-project-carousel"
          style={{
            display: "flex",
            gap: "1.25rem",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            padding: `0 ${CONTENT_PADDING_X}`,
            scrollPaddingLeft: CONTENT_PADDING_X,
          }}
        >
          {projects.map((project) => (
            <div
              key={project._id}
              style={{ flex: "0 0 76vw", maxWidth: 380, scrollSnapAlign: "start" }}
            >
              <ProjectCard project={project} showCategory={showCategory} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div style={{
      ...contentContainer,
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "3rem 2rem",
    }}>
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} showCategory={showCategory} />
      ))}
    </div>
  );
}
