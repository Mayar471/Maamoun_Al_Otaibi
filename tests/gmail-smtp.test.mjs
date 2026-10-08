import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

test("Gmail SMTP uses TLS, fixed addresses, and acknowledges delivery", async t => {
  const parent = resolve(".wrangler/smtp-tests");
  await mkdir(parent, { recursive: true });
  const state = await mkdtemp(join(parent, "smtp-"));
  assert.ok(state.startsWith(parent + sep));
  let source = ts.transpileModule(await readFile("app/cms/gmail-smtp.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  source = source.replace('from "cloudflare:sockets"', 'from "./socket.mjs"');
  await writeFile(join(state, "smtp.mjs"), source);
  await writeFile(join(state, "socket.mjs"), "export function connect(...args) { return globalThis.__testGmailSocket(...args); }");
  const { sendGmail } = await import(pathToFileURL(join(state, "smtp.mjs")));
  t.after(async () => { delete globalThis.__testGmailSocket; await rm(state, { recursive: true, force: true }); });
  const config = { user: "sender@gmail.com", appPassword: "abcdefghijklmnop", email: "manager@example.com" };
  const encoder = new TextEncoder();
  const writes = [];
  let closed = 0;
  function mock(mode = "success") {
    writes.length = 0;
    closed = 0;
    let controller;
    let authChallenge = false;
    let acceptsData = false;
    const send = text => { const data = encoder.encode(text); for (let i=0;i<data.length;i+=3) controller.enqueue(data.slice(i,i+3)); };
    globalThis.__testGmailSocket = (target, options) => {
      assert.deepEqual(target, { hostname: "smtp.gmail.com", port: 465 });
      assert.equal(options.secureTransport, "on");
      const readable = new ReadableStream({ start(c) { controller = c; if (mode !== "timeout") send(mode === "greeting" ? "421 Unavailable\r\n" : "220 smtp.gmail.com Ready\r\n"); } });
      const writable = new WritableStream({ write(bytes) {
        const line = new TextDecoder().decode(bytes);
        writes.push(line);
        if (acceptsData) { if (mode === "disconnect") controller.close(); else send(mode === "data" ? "554 Rejected\r\n" : "250 Message accepted\r\n"); return; }
        if (authChallenge) { assert.equal(Buffer.from(line.trim(), "base64").toString(), "\0sender@gmail.com\0abcdefghijklmnop"); authChallenge = false; send("235 Authenticated\r\n"); return; }
        if (line.startsWith("EHLO ")) send(mode === "multiline" ? "250-First\r\n550 Wrong code\r\n" : "250-smtp.gmail.com\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10000000\r\n");
        else if (line.startsWith("AUTH PLAIN ")) { assert.equal(Buffer.from(line.trim().slice(11), "base64").toString(), "\0sender@gmail.com\0abcdefghijklmnop"); if(mode === "challenge") { authChallenge = true; send("334 Continue\r\n"); } else send(mode === "auth" ? "535 Authentication failed\r\n" : "235 Authenticated\r\n"); }
        else if (line === "MAIL FROM:<sender@gmail.com>\r\n") send("250 Sender accepted\r\n");
        else if (line === "RCPT TO:<manager@example.com>\r\n") send(mode === "recipient" ? "550 Recipient rejected\r\n" : "250 Recipient accepted\r\n");
        else if (line === "DATA\r\n") { acceptsData = true; send("354 Send message\r\n"); }
        else throw new Error("Unexpected SMTP command");
      } });
      return { readable, writable, opened: Promise.resolve({}), closed: Promise.resolve(), async close() { closed++; try { controller.close(); } catch { /* Already canceled. */ } } };
    };
  }
  await t.test("split multiline replies and UTF-8 content", async () => {
    mock();
    const subject = "CMS — Password reset code / كود استرجاع كلمة المرور";
    const body = "Your code: 12345678\nكود التحقق صالح لعشر دقائق.";
    await sendGmail(config, subject, body, "cms-recovery/test-id");
    const message = writes.at(-1);
    assert.match(message, /From: Maamoun CMS <sender@gmail.com>/);
    assert.match(message, /To: <manager@example.com>/);
    const decodedSubject = Array.from(message.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g), match => Buffer.from(match[1], "base64").toString()).join("");
    assert.equal(decodedSubject, subject);
    assert.ok(Array.from(message.matchAll(/=\?UTF-8\?B\?[^?]+\?=/g), match=>match[0]).every(word=>word.length<=75));
    assert.equal(Buffer.from(message.split("\r\n\r\n")[1].replace(/\r\n\.\r\n$/, ""), "base64").toString(), body);
    assert.ok(closed > 0);
  });
  await t.test("AUTH PLAIN challenge response", async () => { mock("challenge"); await sendGmail(config, "Test", "Test", "test"); assert.ok(closed > 0); });
  for (const mode of ["greeting", "multiline", "auth", "recipient", "data", "disconnect"]) {
    await t.test("rejects " + mode + " failure and closes the socket", async () => { mock(mode); await assert.rejects(sendGmail(config, "Test", "Test", "test")); assert.ok(closed > 0); });
  }
  await t.test("rejects header injection and invalid app passwords before opening a socket", async () => {
    let opened = false;
    globalThis.__testGmailSocket = () => { opened = true; throw new Error("Must not connect"); };
    await assert.rejects(sendGmail({ ...config, email: "manager@example.com\r\nBcc: attacker@example.com" }, "Test", "Test", "test"));
    await assert.rejects(sendGmail(config, "Test\r\nBcc: attacker@example.com", "Test", "test"));
    await assert.rejects(sendGmail({ ...config, appPassword: "ordinary-password" }, "Test", "Test", "test"));
    assert.equal(opened, false);
  });
  await t.test("times out and closes an unresponsive server", async () => {
    mock("timeout");
    await assert.rejects(sendGmail(config, "Test", "Test", "test"), /timed out/);
    assert.ok(closed > 0);
  });
});
