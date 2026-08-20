import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import Footer from "./components/Footer";

const pillars = [
  { icon: "Ⅰ", eyebrow: "Knowledge", title: "Principles of\nReal Estate" },
  { icon: "Ⅱ", eyebrow: "Philosophy", title: "The Unspoken\nGame Trilogy" },
  { icon: "Ⅲ", eyebrow: "Power", title: "The Laws of\nReal Estate Power" },
  { icon: "Ⅳ", eyebrow: "Experience", title: "Deals — صفقات" },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-image" role="img" aria-label="Ma'amoun Al Otaibi overlooking the Dubai skyline" /><div className="hero-shade" />
        <div className="hero-content">
          <p className="kicker">Entrepreneur · Author · Creator</p><h1 id="hero-title">MA’AMOUN<br />AL OTAIBI</h1><p className="hero-tagline">Entrepreneur. Author. Creator.</p>
          <div className="ornament" aria-hidden="true"><span /><i /><span /></div>
          <p className="hero-copy">Building businesses, systems, and original intellectual properties across real estate, technology, design, media and other ventures.</p>
          <Link className="outline-button" href="#creations">Discover my world <span aria-hidden="true">→</span></Link>
        </div>
        <a className="scroll-cue" href="#creations" aria-label="Scroll to Maestro Creation Circle">Scroll <span>↓</span></a>
      </section>
      <section className="creation-circle" id="creations" aria-labelledby="creations-title">
        <p className="section-kicker"><span /> Maestro Creation Circle <span /></p><h2 id="creations-title">Four Dimensions. One Vision.</h2>
        <div className="pillars">
          {pillars.map((pillar) => <a className="pillar" href="#" key={pillar.eyebrow}><span className="pillar-icon" aria-hidden="true">{pillar.icon}</span><span className="pillar-label">{pillar.eyebrow}</span><strong>{pillar.title.split("\n").map((line) => <span key={line}>{line}</span>)}</strong><span className="pillar-link">Explore <b aria-hidden="true">→</b></span></a>)}
        </div>
      </section>
      <Footer />
    </main>
  );
}
