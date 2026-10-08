import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import Collection from "../components/Collection";
import { background } from "../cms/model";
import { pageContent, PreviewBanner, type PageProps } from "../cms/public";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Writings & Ideas", alternates: { canonical: "/writings" } };
export default async function Writings(props: PageProps) {
  const { page, preview } = await pageContent("writings", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="writings-hero"><div style={background(f.image)} /><div className="inner-shade" /><section><p className="kicker">{f.kicker}</p><h1>{f.title}</h1><p className="cms-lines">{f.copy}</p></section></section><section className="articles"><Collection kind="writings" items={page.lists.items} preview={preview} /></section><Footer /></main>;
}
