import { groq } from "next-sanity";

// Un progetto è pubblicato solo se è visibile *e* lo è la sua skill
// (`project.category` è un reference a skill, nonostante il nome).
const PROJECT_VISIBLE = `_type == "project" && visible == true && category->visible != false`;

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
