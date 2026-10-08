import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import Collection from "../components/Collection";
import { pageContent, PreviewBanner, type PageProps } from "../cms/public";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ventures", alternates: { canonical: "/ventures" } };
export default async function Ventures(props: PageProps) {
  const { page, preview } = await pageContent("ventures", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="listing-head ventures-head"><p className="kicker">{f.kicker}</p><h1>{f.title}</h1><p>{f.copy}</p></section><section className="listing-body dark"><Collection kind="ventures" items={page.lists.items} preview={preview} /><p className="development-note">◇ <span>{f.note}</span></p></section><Footer /></main>;
}
