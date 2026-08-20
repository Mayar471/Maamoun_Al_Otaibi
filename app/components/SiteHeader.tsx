"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["/", "Home"], ["/about", "About"], ["/ventures", "Ventures"],
  ["/#creations", "Creations"], ["/writings", "Writings"],
  ["/media", "Media"], ["/contact", "Contact"],
];

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className={`site-header ${open ? "nav-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Ma'amoun Al Otaibi, home" onClick={() => setOpen(false)}><span className="brand-mark">M</span><span>MA’AMOUN<br />AL OTAIBI</span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(([href,label]) => <Link className={path === href || (href !== "/" && path.startsWith(href)) ? "active" : ""} href={href} key={label}>{label}</Link>)}
      </nav>
      <button className="menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)} type="button"><span /><span /></button>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([href,label],i) => <Link href={href} key={label} onClick={() => setOpen(false)}><small>0{i+1}</small>{label}</Link>)}
      </nav>
    </header>
  );
}
