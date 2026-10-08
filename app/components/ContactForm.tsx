"use client";
import type { FormEvent } from "react";
export default function ContactForm({ email }: { email: string }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `${data.get("message")}\n\nFrom: ${data.get("name")} <${data.get("email")}>`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(String(data.get("subject") || "Website inquiry"))}&body=${encodeURIComponent(body)}`;
  }
  return <form className="contact-form" onSubmit={submit}><label>Name<input name="name" autoComplete="name" required /></label><label>Email<input type="email" name="email" autoComplete="email" required /></label><label>Subject<input name="subject" /></label><label>Your message<textarea name="message" rows={6} required /></label><button className="gold-button" type="submit">Open email app <span>→</span></button><small>Your message opens in your email app for sending.</small></form>;
}
