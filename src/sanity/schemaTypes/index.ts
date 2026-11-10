import { type SchemaTypeDefinition } from "sanity";
import { projectType } from "./projectType";
import { categoryType } from "./categoryType";
import { skillType } from "./skillType";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [projectType, categoryType, skillType],
};
