export const revalidate = 30;

import { client } from "@/sanity/lib/client";
import { skillsQuery } from "@/sanity/queries";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/Footer";
import SkipLinks from "@/components/layout/SkipLinks";
import ContactForm from "./ContactForm";
import { contentContainer } from "@/lib/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contattaci",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const skills = await client.fetch(skillsQuery);

  return (
    <>
    <SkipLinks links={[
      { id: "modulo", label: "Modulo di contatto" },
      { id: "contatti", label: "Contatti" },
    ]} />
    <main style={{ background: "#08001a", minHeight: "100vh", color: "#fff" }}>
      <NavbarWrapper />

      <div style={{
        ...contentContainer,
        paddingTop: "10rem",
        paddingBottom: "6rem",
      }}>
        <ContactForm skills={skills} />
      </div>

    </main>
    {/* Fuori da <main>: e' il landmark "contentinfo". */}
    <Footer />
    </>
  );
}
