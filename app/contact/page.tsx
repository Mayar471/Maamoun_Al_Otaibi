import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import { background } from "../cms/model";
import { pageContent, PreviewBanner, type PageProps } from "../cms/public";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };
export default async function Contact(props: PageProps) {
  const { page, preview } = await pageContent("contact", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="contact-page" style={f.image ? { backgroundImage: `var(--contact-shade), ${background(f.image)?.backgroundImage}` } : undefined}><div className="contact-intro"><p className="kicker">{f.kicker}</p><h1>{f.title}</h1><p className="cms-lines">{f.copy}</p><dl><div><dt>Email</dt><dd>{f.email}</dd></div><div><dt>Phone</dt><dd>{f.phone}</dd></div><div><dt>Location</dt><dd>{f.location}</dd></div></dl></div><ContactForm email={f.email} /><div className="contact-photo" role="img" aria-label="Dubai skyline seen from an executive office" /></section><Footer /></main>;
}
