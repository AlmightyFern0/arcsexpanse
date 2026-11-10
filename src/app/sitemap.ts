import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { projectSlugsQuery } from "@/sanity/queries";
import { SITE_URL } from "@/lib/site";

// audit §8.2: pagine fisse + ogni progetto pubblicato, dalla stessa query
// delle card. Gli slug sono quelli correnti su Sanity, quindi dopo il cambio
// nello Studio la sitemap usa da sola quelli nuovi.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects: { slug: string; _updatedAt: string }[] = await client.fetch(projectSlugsQuery);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/projects`, lastModified: now },
    { url: `${SITE_URL}/contact`, lastModified: now },
    ...projects
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/projects/${encodeURIComponent(p.slug)}`,
        lastModified: new Date(p._updatedAt),
      })),
  ];
}
