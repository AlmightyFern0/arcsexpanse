import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";

export const categoryType = defineType({
  name: "category",
  title: "Categoria",
  type: "document",
  icon: TagIcon,
  fields: [
    orderRankField({ type: "category" }),
    defineField({
      name: "title",
      title: "Nome categoria",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "hidden",
      title: "Nascondi",
      type: "boolean",
      description: "Se attivo, la categoria non appare in frontend",
      initialValue: false,
    }),
  ],

  preview: {
    select: { title: "title", hidden: "hidden" },
    prepare({ title, hidden }) {
      return {
        title: title ?? "(senza titolo)",
        subtitle: hidden ? "nascosta" : undefined,
      };
    },
  },
});
