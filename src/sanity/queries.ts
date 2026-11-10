import { groq } from "next-sanity";

import { PROJECT_VISIBLE } from "./filters";

// Le categorie nascoste spariscono dall'elenco del progetto, senza nascondere
// il progetto stesso.
const VISIBLE_CATEGORIES = `"categories": categories[@->hidden != true]->{ _id, title, slug }`;

export const projectsQuery = groq`
  *[${PROJECT_VISIBLE}] | order(orderRank asc) {
    _id,
    title,
    slug,
    "category": category->{ _id, title, slug },
    ${VISIBLE_CATEGORIES},
    gridSize,
    diagonalLeft,
    diagonalRight,
    thumbnailImage,
    "thumbnailVideoUrl": thumbnailVideo.asset->url,
    orderRank,
    offsetY,
    layer,
  }
`;

export const projectBySlugQuery = groq`
  *[${PROJECT_VISIBLE} && slug.current == $slug][0] {
    _id,
    title,
    slug,
    orderRank,
    "category": category->{ _id, title, slug },
    ${VISIBLE_CATEGORIES},
    description,
    heroType,
    heroImage,
    heroIframeUrl,
    "sceneLightColor": sceneLightColor.hex,
    listaImmaginiDettaglioProgetto,
  }
`;

// Esistenza di un progetto pubblicato, per i redirect degli slug rinominati.
export const projectSlugExistsQuery = groq`
  count(*[${PROJECT_VISIBLE} && slug.current == $slug]) > 0
`;

// Slug e data di modifica di ogni progetto pubblicato, per la sitemap.
export const projectSlugsQuery = groq`
  *[${PROJECT_VISIBLE}] | order(orderRank asc) { "slug": slug.current, _updatedAt }
`;

export const categoriesQuery = groq`
  *[_type == "category" && hidden != true] | order(orderRank asc) {
    _id,
    title,
    slug,
  }
`;

export const worksProjectsQuery = groq`
  *[${PROJECT_VISIBLE}] | order(orderRank asc) {
    _id,
    title,
    slug,
    "category": category->{ _id, title, slug },
    ${VISIBLE_CATEGORIES},
    thumbnailImage,
    "thumbnailVideoUrl": thumbnailVideo.asset->url,
  }
`;

export const skillsQuery = groq`
  *[_type == "skill" && visible == true] | order(orderRank asc) {
    _id,
    title,
    slug,
    description,
    splineUrl,
  }
`;

export const nextProjectQuery = groq`
  *[${PROJECT_VISIBLE} && orderRank > $orderRank] | order(orderRank asc)[0] {
    title,
    slug,
  }
`;

// 3 progetti successivi (con wraparound dall'inizio se si è verso la fine)
export const nextProjectsQuery = groq`
  {
    "after": *[${PROJECT_VISIBLE} && orderRank > $orderRank]
      | order(orderRank asc)[0...3] {
        _id, title, slug,
        "category": category->{ _id, title },
        thumbnailImage,
      },
    "wrap": *[${PROJECT_VISIBLE} && orderRank <= $orderRank && slug.current != $slug]
      | order(orderRank asc)[0...3] {
        _id, title, slug,
        "category": category->{ _id, title },
        thumbnailImage,
      }
  }
`;
