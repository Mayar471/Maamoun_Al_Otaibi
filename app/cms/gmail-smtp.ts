import { connect } from "cloudflare:sockets";
export type GmailConfig = { user: string; appPassword: string; email: string };
const encoder = new TextEncoder();
const base64 = (text: string) => btoa(Array.from(encoder.encode(text), byte => String.fromCharCode(byte)).join(""));
function address(value: string) { return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value); }
function encodedSubject(value: string) {
  const parts: string[] = [];
  let chunk = "";
  for (const character of value) {
    if (encoder.encode(chunk + character).length > 42) { parts.push("=?UTF-8?B?" + base64(chunk) + "?="); chunk = ""; }
    chunk += character;
  }
  if (chunk) parts.push("=?UTF-8?B?" + base64(chunk) + "?=");
  return parts.join("\r\n ");
}
export async function sendGmail(config: GmailConfig, subject: string, text: string, id: string) {
  if (!address(config.user) || !address(config.email) || !config.user.toLowerCase().endsWith("@gmail.com") || !/^[a-z0-9]{16}$/i.test(config.appPassword) || /[\r\n]/.test(subject)) throw new Error("Invalid Gmail configuration");
  // Only authenticated Gmail SMTP over implicit TLS; no configurable host or plaintext fallback.
  const socket = connect({ hostname: "smtp.gmail.com", port: 465 }, { secureTransport: "on", allowHalfOpen: false });
  void socket.closed.catch(() => {});
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const decoder = new TextDecoder();
  let pending = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function reply() {
    let code = 0;
    let total = 0;
    for (let lines = 0; lines < 100; lines++) {
      while (!pending.includes("\r\n")) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("SMTP connection closed before acknowledgement");
        pending += decoder.decode(chunk.value, { stream: true });
        if (pending.length > 32768) throw new Error("SMTP response exceeds limit");
      }
      const index = pending.indexOf("\r\n");
      const line = pending.slice(0, index);
      pending = pending.slice(index + 2);
      total += line.length;
      if (total > 32768 || !/^\d{3}[ -]/.test(line)) throw new Error("Invalid SMTP response");
      const next = Number(line.slice(0, 3));
      if (code && next !== code) throw new Error("Inconsistent SMTP response");
      code = next;
      if (line[3] === " ") return code;
    }
    throw new Error("SMTP response has too many lines");
  }
  async function command(line: string, expected: number[]) {
    await writer.write(encoder.encode(line + "\r\n"));
    const code = await reply();
    if (!expected.includes(code)) throw new Error("SMTP command rejected (" + code + ")");
    return code;
  }
  async function deliver() {
    await socket.opened;
    if (await reply() !== 220) throw new Error("SMTP greeting rejected");
    await command("EHLO cms.local", [250]);
    const auth = base64("\0" + config.user + "\0" + config.appPassword);
    const code = await command("AUTH PLAIN " + auth, [235, 334]);
    if (code === 334) await command(auth, [235]);
    await command("MAIL FROM:<" + config.user + ">", [250]);
    await command("RCPT TO:<" + config.email + ">", [250]);
    await command("DATA", [354]);
    const encodedBody = base64(text).match(/.{1,76}/g)?.join("\r\n") ?? "";
    const message = [
      "From: Maamoun CMS <" + config.user + ">", "To: <" + config.email + ">",
      "Subject: " + encodedSubject(subject), "Date: " + new Date().toUTCString(),
      "Message-ID: <" + id.replace(/[^a-z0-9.-]/gi, "-") + "@gmail.com>",
      "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64",
      "", encodedBody, ".", "",
    ].join("\r\n");
    await writer.write(encoder.encode(message));
    if (await reply() !== 250) throw new Error("SMTP message was not accepted");
  }
  try {
    await Promise.race([deliver(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { void socket.close().catch(() => {}); reject(new Error("SMTP delivery timed out")); }, 20000);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    void reader.cancel().catch(() => {});
    void writer.abort().catch(() => {});
    void socket.close().catch(() => {});
  }
}
