import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "669ozh26",
  dataset: "production",
  apiVersion: "2026-02-22",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const docs = await client.fetch(`*[_type == "category" && defined(order)]{ _id }`);
console.log(`Trovati ${docs.length} documenti con campo "order"`);

for (const doc of docs) {
  await client.patch(doc._id).unset(["order"]).commit();
  console.log(`Patchato: ${doc._id}`);
}

console.log("Fatto.");
