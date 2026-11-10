import type { StructureResolver } from "sanity/structure";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Expanse by Arc's")
    .items([
      orderableDocumentListDeskItem({ type: "project", title: "Progetti", S, context }),
      orderableDocumentListDeskItem({ type: "category", title: "Categorie", S, context }),
      orderableDocumentListDeskItem({ type: "skill", title: "Skill", S, context }),
    ]);
