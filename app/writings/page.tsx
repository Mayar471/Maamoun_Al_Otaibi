"use client";
import {useState} from "react";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
const posts=[
 ["May 28, 2024","The Illusion of Control in Real Estate","Real Estate"],["May 12, 2024","Power is Invisible, But Always Working","Power & Negotiation"],["Apr 28, 2024","Why Most Deals Fail Before They Start","Strategy"],["Apr 14, 2024","Leverage: The Quiet Multiplier","Power & Negotiation"],["Apr 1, 2024","Long-Term Thinking in a Short-Term World","Strategy"]];
const filters=["All","Real Estate","Power & Negotiation","Strategy","Leadership"];
export default function Writings(){const[filter,setFilter]=useState("All");const shown=filter==="All"?posts:posts.filter(p=>p[2]===filter);return <main><SiteHeader/><section className="writings-hero"><div/><div className="inner-shade"/><section><p className="kicker">Notes from the field</p><h1>Writings & Ideas</h1><p>Thoughts on business, power,<br/>strategy, and human behavior.</p></section></section><section className="articles"><div className="filters light" role="group" aria-label="Filter articles">{filters.map(f=><button className={filter===f?"active":""} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div><div className="article-list">{shown.map(([date,title,cat])=><a href="#" className="article-row" key={title}><time>{date}</time><h2>{title}</h2><span>{cat}</span><b>→</b></a>)}</div></section><Footer/></main>}
