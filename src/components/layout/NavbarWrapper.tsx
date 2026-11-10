import { client } from "@/sanity/lib/client";
import { skillsQuery } from "@/sanity/queries";
import Navbar from "./Navbar";

export default async function NavbarWrapper() {
  const skills = await client.fetch(skillsQuery);
  return <Navbar skills={skills} />;
}
