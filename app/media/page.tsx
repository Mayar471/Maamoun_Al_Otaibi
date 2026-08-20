import type {Metadata} from "next";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
export const metadata:Metadata={title:"Media & Speaking"};
const stats=[["50+","Interviews"],["30+","Podcasts"],["20+","Conferences"],["10+","Countries"]];
export default function Media(){return <main><SiteHeader/><section className="inner-hero media-hero"><div className="inner-photo"/><div className="inner-shade"/><div className="inner-copy"><p className="kicker">Ideas in conversation</p><h1>Media &<br/>Speaking</h1><p className="gold-rule">Interviews, appearances,<br/>and speaking engagements.</p></div></section><section className="media-body"><div className="stats">{stats.map(([n,l])=><div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div><p className="section-kicker"><span/> Featured in <span/></p><div className="publications"><span>The Global Journal</span><span>Business Perspectives</span><span>Leadership Chronicles</span><span>The Innovation Review</span><span>Visionary Today</span></div></section><Footer/></main>}
