import { readSnapshot } from "../cms/storage";
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation matches the existing Vinext site. */
export default async function Footer() {
  const settings = (await readSnapshot()).content.settings.fields;
  return <footer className="footer"><p>{settings.title.toUpperCase()}</p><nav><a href="/about">About</a><a href="/ventures">Ventures</a><a href="/writings">Writings</a><a href="/contact">Contact</a></nav><small>{settings.footer}</small></footer>;
}
