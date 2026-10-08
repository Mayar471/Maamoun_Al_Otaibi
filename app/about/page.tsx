import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { background } from "../cms/model";
import { pageContent, PreviewBanner, type PageProps } from "../cms/public";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };
export default async function About(props: PageProps) {
  const { page, preview } = await pageContent("about", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="inner-hero about-hero"><div className="inner-photo" style={background(f.image)} /><div className="inner-shade" /><div className="inner-copy"><p className="kicker">{f.kicker}</p><h1 className="cms-lines">{f.title}</h1><p className="hero-tagline">{f.tagline}</p><p>{f.copy}</p></div></section><section className="about-body"><div className="stats">{page.lists.stats.map(item => <div key={item.id}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div><div className="journey"><div><p className="section-kicker left">{f.journeyLabel}</p><h2 className="cms-lines">{f.journeyTitle}</h2></div><ol>{page.lists.journey.map(item => <li key={item.id}><time>{item.year}</time><p>{item.text}</p></li>)}</ol></div></section><Footer /></main>;
}
