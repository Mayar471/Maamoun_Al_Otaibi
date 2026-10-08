import SiteHeader from "./components/SiteHeader";
import Footer from "./components/Footer";
import { background } from "./cms/model";
import { pageContent, PreviewBanner, type PageProps } from "./cms/public";
export const dynamic = "force-dynamic";
export default async function Home(props: PageProps) {
  const { page, preview } = await pageContent("home", props);
  const f = page.fields;
  return <main><PreviewBanner visible={preview} /><SiteHeader /><section className="hero" aria-labelledby="hero-title"><div className="hero-image" style={background(f.image)} role="img" aria-label={f.title} /><div className="hero-shade" /><div className="hero-content"><p className="kicker">{f.kicker}</p><h1 id="hero-title" className="cms-lines">{f.title}</h1><p className="hero-tagline">{f.tagline}</p><div className="ornament" aria-hidden="true"><span /><i /><span /></div><p className="hero-copy">{f.copy}</p><a className="outline-button" href="#creations">{f.button}<span aria-hidden="true">→</span></a></div><a className="scroll-cue" href="#creations">Scroll <span>↓</span></a></section><section className="creation-circle" id="creations" aria-labelledby="creations-title"><p className="section-kicker"><span />{f.circleLabel}<span /></p><h2 id="creations-title">{f.circleTitle}</h2><div className="pillars">{page.lists.pillars.map(pillar => <a className="pillar" href={pillar.href || "#creations"} key={pillar.id}><span className="pillar-icon" aria-hidden="true">{pillar.icon}</span><span className="pillar-label">{pillar.eyebrow}</span><strong className="cms-lines">{pillar.title}</strong><span className="pillar-link">Explore <b aria-hidden="true">→</b></span></a>)}</div></section><Footer /></main>;
}
