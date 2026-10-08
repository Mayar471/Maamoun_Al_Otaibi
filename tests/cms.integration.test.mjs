import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { readFile, mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeStorage = process.env.CMS_STORAGE_DRIVER === "node";
const base = `http://localhost:${nodeStorage ? 3108 : 3107}`;

test(`CMS integration against isolated ${nodeStorage ? "SQLite/filesystem" : "D1/R2"} state`, { timeout: 180_000 }, async t => {
  const vars = await readFile(resolve(root, ".dev.vars"), "utf8");
  const password = vars.match(/^CMS_ADMIN_PASSWORD=(.+)$/m)?.[1].trim();
  const secret = vars.match(/^CMS_SESSION_SECRET=(.+)$/m)?.[1].trim();
  assert.ok(password, "Configure .dev.vars before running the integration suite.");
  const parent = resolve(root, ".wrangler", "integration");
  const state = resolve(parent, randomUUID());
  assert.ok(state.startsWith(parent + sep));
  await mkdir(state, { recursive: true });
  const production = process.env.CMS_TEST_PRODUCTION === "1";
  const server = spawn(process.execPath, ["node_modules/vinext/dist/cli.js", production ? "start" : "dev", "--port", nodeStorage ? "3108" : "3107"], {
    cwd: root, env: { ...process.env, VINEXT_NO_DEV_LOCK: "1", CMS_TEST_STATE_PATH: state, ...(nodeStorage ? { CMS_DATA_DIR: state, CMS_ADMIN_PASSWORD: password, CMS_SESSION_SECRET: secret } : {}) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  let logs = "";
  let spawnError;
  server.on("error", error => { spawnError = error; });
  const checkServer = () => { if (spawnError) throw spawnError; if (server.exitCode !== null) throw new Error(`Server exited unexpectedly: ${logs}`); };
  for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { logs = (logs + chunk.toString()).slice(-16000); });
  t.after(async () => {
    if (server.pid && server.exitCode === null) {
      if (process.platform === "win32") { try { execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { server.kill(); } }
      else server.kill("SIGTERM");
    }
    if (state.startsWith(parent + sep)) await rm(state, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  let ready = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error(`Development server exited: ${logs}`);
    try { const response = await fetch(`${base}/admin`, { signal: AbortSignal.timeout(1500) }); if (response.status === 200) { await response.text(); ready = true; break; } } catch { /* Server still starting. */ }
    await new Promise(done => setTimeout(done, 500));
  }
  assert.ok(ready, `Development server did not become ready: ${logs}`);
  let cookie = "";
  const call = async (path, method = "GET", data, options = {}) => { checkServer(); try { return await fetch(base + path, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== "GET" ? { Origin: base } : {}), ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers },
    ...(data ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {}),
  }); } catch (error) { throw new Error(`Request failed (${method} ${path}): ${logs}`, { cause: error }); } };
  let snapshot;
  await t.test("protects admin APIs, login, and cross-origin writes", async () => {
    assert.equal((await call("/api/cms/content")).status, 401);
    assert.equal((await call("/api/cms/media")).status, 401);
    assert.equal((await call("/api/cms/session", "POST", { password }, { headers: { Origin: "https://example.com" } })).status, 403);
    assert.equal((await call("/api/cms/session", "POST", { password: "invalid-password" })).status, 401);
    const login = await call("/api/cms/session", "POST", { password });
    assert.equal(login.status, 200, await login.text());
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
    cookie = login.headers.get("set-cookie").split(";")[0];
    const dashboard = await (await call("/admin")).text();
    assert.match(dashboard, /استوديو المحتوى/);
    snapshot = await (await call("/api/cms/content")).json();
    assert.equal(snapshot.revision, 0);
    const denied = await call("/api/cms/content", "PUT", snapshot, { headers: { Origin: "https://example.com" } });
    assert.equal(denied.status, 403);
  });
  await t.test("renders a single CMS language and independent persisted themes", async () => {
    const preferenceCookie = `${cookie}; cms-language=en; cms-theme=dark; site-theme=light`;
    const englishPage = await (await call("/admin", "GET", undefined, { headers: { Cookie: preferenceCookie } })).text();
    assert.match(englishPage, /class="cms cms-dashboard" dir="ltr" lang="en"/);
    assert.match(englishPage, /Save draft/);
    assert.match(englishPage, /Image library/);
    assert.doesNotMatch(englishPage, /حفظ المسودة/);
    assert.match(englishPage, /data-cms-theme="dark"/);
    assert.match(englishPage, /data-site-theme="light"/);
    const site = await (await call("/", "GET", undefined, { headers: { Cookie: preferenceCookie } })).text();
    assert.match(site, /data-site-theme="light"/);
    assert.match(site, /aria-label="Switch to dark mode"/);
    const arabicPage = await (await call("/admin", "GET", undefined, { headers: { Cookie: `${cookie}; cms-language=ar; cms-theme=light; site-theme=dark` } })).text();
    assert.match(arabicPage, /class="cms cms-dashboard" dir="rtl" lang="ar"/);
    assert.match(arabicPage, /حفظ المسودة/);
    assert.doesNotMatch(arabicPage, /Save draft/);
    assert.match(arabicPage, /data-cms-theme="light"/);
    const login = await (await fetch(base + "/admin", { headers: { Cookie: "cms-language=en; cms-theme=dark" } })).text();
    assert.match(login, /class="cms-login cms" dir="ltr" lang="en"/);
    assert.match(login, /Content management studio/);
    assert.match(login, /Password/);
    assert.doesNotMatch(login, /كلمة المرور/);
    const unchanged = await (await call("/api/cms/content")).json();
    assert.equal(unchanged.revision, snapshot.revision);
    assert.deepEqual(unchanged.content, snapshot.content);
  });
  const title = `CMS integration ${randomUUID()}`;
  await t.test("draft stays private, public preview requires login, and stale saves conflict", async () => {
    snapshot.content.home.fields.title = title;
    snapshot.content.writings.lists.items[0].body = "First paragraph.\n\nSecond paragraph.";
    const saved = await call("/api/cms/content", "PUT", { content: snapshot.content, revision: snapshot.revision });
    assert.equal(saved.status, 200, await saved.clone().text());
    snapshot = await saved.json();
    assert.equal(snapshot.revision, 1);
    assert.ok(!(await (await call("/")).text()).includes(title));
    assert.ok((await (await call("/?cmsPreview=1")).text()).includes(title));
    assert.ok(!(await (await fetch(base + "/?cmsPreview=1")).text()).includes(title));
    assert.equal((await call("/api/cms/content", "PUT", { content: snapshot.content, revision: 0 })).status, 409);
    assert.equal((await call("/api/cms/content", "POST", { revision: 2 })).status, 409);
    const bad = structuredClone(snapshot.content);
    bad.home.lists.pillars[0].href = "javascript:alert(1)";
    assert.equal((await call("/api/cms/content", "PUT", { content: bad, revision: snapshot.revision })).status, 400);
    bad.home.lists.pillars[0].href = "/about";
    bad.ventures.lists.items[0].image = "data:image/svg+xml,<svg/>";
    assert.equal((await call("/api/cms/content", "PUT", { content: bad, revision: snapshot.revision })).status, 400);
    const second = await call("/api/cms/content", "PUT", { content: snapshot.content, revision: snapshot.revision });
    assert.equal(second.status, 200, await second.clone().text());
    snapshot = await second.json();
    assert.equal(snapshot.revision, 2);
  });
  await t.test("publishing updates public pages and article details", async () => {
    const published = await call("/api/cms/content", "POST", { revision: snapshot.revision });
    assert.equal(published.status, 200, await published.clone().text());
    snapshot = await published.json();
    assert.ok(snapshot.publishedAt);
    assert.ok((await (await fetch(base + "/")).text()).includes(title));
    const article = await fetch(base + `/writings/${snapshot.content.writings.lists.items[0].id}`);
    assert.equal(article.status, 200);
    assert.match(await article.text(), /First paragraph/);
    assert.equal((await fetch(base + "/writings/missing")).status, 404);
    for (const path of ["/about", "/ventures", "/writings", "/media", "/contact"]) assert.equal((await fetch(base + path)).status, 200, path);
  });
  await t.test("uploads an image, retrieves it, and rejects unsupported or oversized files", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1kAAAAASUVORK5CYII=", "base64");
    const form = new FormData(); form.set("file", new Blob([png], { type: "image/png" }), "test.png");
    const uploaded = await call("/api/cms/media", "POST", form);
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const item = await uploaded.json();
    const file = await fetch(base + `/api/media/${item.id}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "image/png");
    assert.equal(file.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), png);
    assert.ok((await (await call("/api/cms/media")).json()).some(row => row.id === item.id));
    const svg = new FormData(); svg.set("file", new Blob(["<svg><script>alert(1)</script></svg>"], { type: "image/svg+xml" }), "bad.svg");
    assert.equal((await call("/api/cms/media", "POST", svg)).status, 400);
    const fake = new FormData(); fake.set("file", new Blob(["this is not an image"], { type: "image/png" }), "fake.png");
    assert.equal((await call("/api/cms/media", "POST", fake)).status, 400);
    const large = new FormData(); large.set("file", new Blob([new Uint8Array(5_400_000)], { type: "image/png" }), "large.png");
    assert.equal((await call("/api/cms/media", "POST", large)).status, 413);
  });
  await t.test("persists saved content and clears login cookies on logout", async () => {
    const reloaded = await (await call("/api/cms/content")).json();
    assert.equal(reloaded.content.home.fields.title, title);
    assert.equal(reloaded.revision, snapshot.revision);
    const response = await call("/api/cms/session", "POST", { action: "logout" });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
    cookie = "";
    assert.equal((await call("/api/cms/content")).status, 401);
  });
});
