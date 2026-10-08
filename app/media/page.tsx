import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { background } from "../cms/model";
import { pageContent, PreviewBanner, type PageProps } from "../cms/public";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Media & Speaking", alternates: { canonical: "/media" } };
export default async function Media(props: PageProps) {
  const { page, preview } = await pageContent("media", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="inner-hero media-hero"><div className="inner-photo" style={background(f.image)} /><div className="inner-shade" /><div className="inner-copy"><p className="kicker">{f.kicker}</p><h1 className="cms-lines">{f.title}</h1><p className="gold-rule cms-lines">{f.copy}</p></div></section><section className="media-body"><div className="stats">{page.lists.stats.map(item => <div key={item.id}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div><p className="section-kicker"><span />{f.featuredLabel}<span /></p><div className="publications">{page.lists.publications.map(item => <span key={item.id}>{item.name}</span>)}</div></section><Footer /></main>;
}
