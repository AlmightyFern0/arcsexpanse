import { defineField, defineType } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";

export const skillType = defineType({
  name: "skill",
  title: "Skill",
  type: "document",
  fields: [
    orderRankField({ type: "skill" }),
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
      name: "description",
      title: "Descrizione",
      type: "text",
      rows: 4,
      description:
        "Testo della card che compare in hover sulla skill in home (e nella hero della pagina skill). Meglio 1–3 frasi brevi.",
    }),
    defineField({
      name: "splineUrl",
      title: "Spline URL (.splinecode)",
      type: "url",
      description:
        "URL scena Spline in formato prod.spline.design/.../scene.splinecode (non l'iframe my.spline.design). Se vuoto, la card resta vuota.",
      validation: (r) =>
        r.uri({ scheme: ["https"] }).custom((value) => {
          if (!value) return true;
          return value.endsWith(".splinecode")
            ? true
            : "Deve terminare con .splinecode (usa il link prod.spline.design, non l'iframe)";
        }),
    }),
    defineField({
      name: "visible",
      title: "Visibile",
      type: "boolean",
      initialValue: true,
    }),
  ],

  preview: {
    select: { title: "title", visible: "visible" },
    prepare({ title, visible }) {
      return {
        title: title ?? "(senza titolo)",
        subtitle: visible === false ? "nascosta" : undefined,
      };
    },
  },
});
