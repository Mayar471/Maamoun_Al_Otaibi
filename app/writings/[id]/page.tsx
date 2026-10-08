import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import Footer from "../../components/Footer";
import { pageContent, PreviewBanner, type PageProps } from "../../cms/public";
export const dynamic = "force-dynamic";
export default async function Article(props: PageProps & { params: Promise<{ id: string }> }) {
  const { page, preview } = await pageContent("writings", props);
  const { id } = await props.params;
  const article = page.lists.items.find(item => item.id === id && item.body);
  if (!article) notFound();
  return <main><PreviewBanner visible={preview} /><SiteHeader /><article className="cms-article"><a href={`/writings${preview ? "?cmsPreview=1" : ""}`}>← All writings</a><p className="kicker">{article.cat} · {article.date}</p><h1>{article.title}</h1><div className="cms-lines">{article.body}</div></article><Footer /></main>;
}
