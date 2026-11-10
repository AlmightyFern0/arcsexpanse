import { defineField, defineType } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";


export const projectType = defineType({
  name: "project",
  title: "Progetto",
  type: "document",
  fields: [
    orderRankField({ type: "project" }),
    defineField({
      name: "title",
      title: "Titolo",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "SKILLS",
      type: "reference",
      to: [{ type: "skill" }],
      description: "Mostrata sull'intestazione della pagina progetto e nella card",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "categories",
      title: "Categorie filtro",
      type: "array",
      of: [{
        type: "reference",
        to: [{ type: "category" }],
        options: {
          filter: "defined(title)",
        },
      }],
      description: "Tutte le categorie a cui appartiene il progetto (usate nei filtri della pagina Works)",
    }),
    defineField({
      name: "description",
      title: "Descrizione",
      type: "text",
      rows: 4,
      description: "Gli a capo vengono mantenuti in pagina",
    }),
    defineField({
      name: "visible",
      title: "Visibile in homepage",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "gridSize",
      title: "Dimensione in griglia",
      type: "string",
      options: {
        list: [
          { title: "1/3 — stretta", value: "one-third" },
          { title: "2/3 — larga", value: "two-thirds" },
          { title: "3/3 — intera riga", value: "full" },
        ],
      },
      initialValue: "two-thirds",
    }),
    defineField({
      name: "diagonalLeft",
      title: "Separatore diagonale (bordo sinistro)",
      type: "string",
      description: "Diagonale sul bordo sinistro di questa card",
      options: {
        list: [
          { title: "Nessuno (retto)", value: "none" },
          { title: "/ — da basso-sinistra ad alto-destra", value: "slash" },
          { title: "\\ — da alto-sinistra a basso-destra", value: "backslash" },
        ],
      },
      initialValue: "none",
      hidden: ({ document }) => document?.gridSize === "full",
    }),
    defineField({
      name: "diagonalRight",
      title: "Separatore diagonale (bordo destro)",
      type: "string",
      description: "Diagonale tra questo progetto e quello a destra nella stessa riga",
      options: {
        list: [
          { title: "Nessuno (retto)", value: "none" },
          { title: "/ — da basso-sinistra ad alto-destra", value: "slash" },
          { title: "\\ — da alto-sinistra a basso-destra", value: "backslash" },
        ],
      },
      initialValue: "none",
      hidden: ({ document }) => document?.gridSize === "full",
    }),

    // --- Layout griglia parallasse ---
    defineField({
      name: "offsetY",
      title: "Offset verticale (px)",
      type: "number",
      description:
        "Sfalsa la card verso il basso rispetto alle altre della stessa riga. Solo valori positivi: per alzare una card, abbassa l'altra. L'altezza della riga si adegua, quindi non invade la riga vicina.",
      initialValue: 0,
      validation: (r) => r.min(0).integer(),
    }),
    defineField({
      name: "layer",
      title: "Layer (z-index)",
      type: "number",
      description: "Chi sta davanti nella griglia",
      initialValue: 1,
      options: {
        list: [
          { title: "1 — Dietro", value: 1 },
          { title: "2 — Medio", value: 2 },
          { title: "3 — Davanti", value: 3 },
        ],
      },
      validation: (r) => r.min(1).max(3),
    }),

    // --- Media per la griglia homepage ---
    defineField({
      name: "thumbnailVideo",
      title: "Video griglia (loop breve)",
      type: "file",
      options: { accept: "video/*" },
      description: "Video corto in loop mostrato on hover nella griglia homepage",
    }),
    defineField({
      name: "thumbnailImage",
      title: "Immagine griglia (freeze frame)",
      type: "image",
      description:
        "Immagine statica mostrata prima dell'hover. Le card hanno forme diverse secondo la dimensione in griglia e lo schermo, quindi l'immagine viene sempre ritagliata. Apri l'immagine con il pulsante di ritaglio e sposta il cerchio sul soggetto: in ogni card e su ogni dispositivo il taglio si centrerà lì. Senza punto focale si usa il centro.",
      // Punto focale e ritaglio decisi dal cliente nello Studio; il frontend
      // chiede a Sanity immagini già nella forma della cornice, centrate lì.
      options: { hotspot: true },
    }),

    // --- Hero della pagina progetto ---
    defineField({
      name: "heroType",
      title: "Tipo di hero",
      type: "string",
      options: {
        list: [
          { title: "Immagine", value: "photo" },
          { title: "iFrame / embed", value: "iframe" },
        ],
      },
      initialValue: "photo",
    }),
    defineField({
      name: "heroImage",
      title: "Hero — Immagine",
      type: "image",
      description: "Dimensione consigliata: 1200×900px (rapporto 4:3)",
      hidden: ({ document }) => document?.heroType !== "photo",
    }),
    defineField({
      name: "heroIframeUrl",
      title: "Hero — URL iFrame",
      type: "url",
      hidden: ({ document }) => document?.heroType !== "iframe",
    }),

    // --- Scena 3D di sfondo (HeroCanvas) ---
    defineField({
      name: "sceneLightColor",
      title: "Scena 3D — Colore luce",
      type: "color",
      options: { disableAlpha: true },
      description:
        "Colore della luce che segue il cursore. Se vuoto usa il default (#4419AE).",
    }),

    // --- Lista immagini dettaglio progetto ---
    defineField({
      name: "listaImmaginiDettaglioProgetto",
      title: "Lista Immagini Dettaglio Progetto",
      type: "array",
      description: "Lista di immagini mostrate impilate nella pagina dettaglio progetto",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              type: "string",
              title: "Testo alternativo",
              description:
                "Descrive cosa mostra l'immagine a chi non la vede (screen reader). " +
                "Lascia vuoto se l'immagine e' solo decorativa. Se vuoto si usa la didascalia.",
              validation: (rule) => rule.max(250),
            }),
            defineField({ name: "caption", type: "string", title: "Didascalia (opzionale)" }),
          ],
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: "title",
      categoryTitle: "category.title",
      media: "thumbnailImage",
    },
    prepare({ title, categoryTitle, media }) {
      return { title, subtitle: categoryTitle, media };
    },
  },
});
