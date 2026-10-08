"use client";
import { useState } from "react";
import { background, type RecordItem } from "../cms/model";
export default function Collection({ kind, items, preview }: { kind: "ventures" | "writings"; items: RecordItem[]; preview: boolean }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", ...new Set(items.map(item => item.cat).filter(Boolean))];
  const shown = filter === "All" ? items : items.filter(item => item.cat === filter);
  return <><div className={`filters ${kind === "writings" ? "light" : ""}`} role="group" aria-label={`Filter ${kind}`}>{filters.map(value => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div>{!shown.length && <p className="collection-empty">More updates are coming soon.</p>}<div className={kind === "ventures" ? "venture-grid" : "article-list"}>{shown.map((item, index) => kind === "ventures" ? <article className={`venture-card ${["one", "two", "three", "four", "five", "six"][index % 6]}`} key={item.id}><div className="card-photo" style={background(item.image)} /><div className="card-content"><span>{item.cat}</span><h2>{item.name}</h2><p>{item.desc}</p>{item.href ? <a className="card-link" href={item.href} target="_blank" rel="noopener noreferrer">Visit website ↗</a> : <span className="card-link">Website coming soon</span>}</div></article> : <article className="article-row" key={item.id}><time>{item.date}</time><h2>{item.body ? <a href={`/writings/${item.id}${preview ? "?cmsPreview=1" : ""}`}>{item.title}</a> : item.title}</h2><span>{item.cat}</span><b aria-hidden="true">→</b></article>)}</div></>;
}
