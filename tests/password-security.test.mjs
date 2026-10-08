import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

test("password changes and manager-only email recovery", async t => {
  const parent = resolve(".wrangler/security");
  await mkdir(parent, { recursive: true });
  const state = await mkdtemp(join(parent, "auth-"));
  assert.ok(state.startsWith(parent + sep));
  const originalFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  process.env.CMS_DATA_DIR = state;
  process.env.CMS_ADMIN_PASSWORD = "initial-test-password-123";
  process.env.CMS_SESSION_SECRET = "test-only-secret-with-more-than-thirty-two-characters";
  process.env.CMS_ADMIN_EMAIL = "manager@example.com";
  process.env.RESEND_API_KEY = "test-only-not-a-real-key";
  process.env.CMS_EMAIL_FROM = "CMS <cms@example.com>";
  const mails = [];
  let deliveryFails = false;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    assert.deepEqual(body.to, ["manager@example.com"]);
    assert.ok(init.headers["Idempotency-Key"]);
    if (deliveryFails) return Response.json({ error: "unavailable" }, { status: 503 });
    mails.push(body);
    return Response.json({ id: crypto.randomUUID() });
  };
  await writeFile(join(state, "headers.mjs"), "export async function cookies() { return { get() { return undefined; } }; }");
  for (const name of ["model", "node-bindings", "storage", "password", "auth", "recovery"]) {
    const source = await readFile(resolve("app/cms/" + name + ".ts"), "utf8");
    let output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    output = output.replace(/from "\.\/([^".]+)"/g, 'from "./$1.mjs"').replace('from "cloudflare:workers"', 'from "./node-bindings.mjs"').replace('from "next/headers"', 'from "./headers.mjs"');
    await writeFile(join(state, name + ".mjs"), output);
  }
  const moduleAt = name => import(pathToFileURL(join(state, name + ".mjs")));
  const password = await moduleAt("password");
  const auth = await moduleAt("auth");
  const recovery = await moduleAt("recovery");
  const storage = await moduleAt("storage");
  const { DatabaseSync } = await import("node:sqlite");
  const inspector = new DatabaseSync(join(state, "content.sqlite"));
  t.after(async () => {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
    inspector.close();
    // The adapter owns a SQLite connection until this test process exits.
    // Its files remain under ignored .wrangler/security, never production state.
    await rm(join(state, "headers.mjs"), { force: true });
  });
  const newCode = () => mails.findLast(mail => mail.subject.includes("reset code")).text.match(/\b\d{8}\b/)[0];
  const unlock = async () => {
    await storage.database().prepare("DELETE FROM cms_login_attempts WHERE id LIKE 'recovery-%'").run();
    await storage.database().prepare("UPDATE cms_password_recovery SET next_request_at=0").run();
  };
  await t.test("bootstrap password, salted password hash, and revoked old sessions", async () => {
    assert.equal(await password.checkPassword("wrong-password"), false);
    assert.equal(await password.checkPassword(process.env.CMS_ADMIN_PASSWORD), true);
    const session = await auth.createSession();
    assert.equal(await auth.validSession(session), true);
    const context = await password.passwordContext();
    assert.equal(await password.replacePassword("changed-test-password-456", context), true);
    assert.equal(await auth.validSession(session), false);
    assert.equal(await auth.validSession(await auth.createSession(context)), false);
    assert.equal(await password.checkPassword(process.env.CMS_ADMIN_PASSWORD), false);
    assert.equal(await password.checkPassword("changed-test-password-456"), true);
    const row = inspector.prepare("SELECT * FROM cms_admin_auth").get();
    assert.match(row.password_hash, /^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(row).includes("changed-test-password"));
    assert.equal(await password.replacePassword("stale-password-update-123", context), false);
  });
  await t.test("fixed recipient, request throttling, and non-plaintext stored codes", async () => {
    const request = await recovery.requestRecovery();
    assert.ok(request.requestId);
    const code = newCode();
    const row = inspector.prepare("SELECT * FROM cms_password_recovery").get();
    assert.notEqual(row.code_hash, code);
    assert.equal(row.sent, 1);
    assert.match(row.code_hash, /^[a-f0-9]{64}$/);
    await assert.rejects(recovery.requestRecovery(), error => error.status === 429);
  });
  await t.test("wrong codes, successful single use reset, old password and session invalidation", async () => {
    const row = inspector.prepare("SELECT * FROM cms_password_recovery").get();
    const session = await auth.createSession();
    const wrong = newCode() === "00000000" ? "11111111" : "00000000";
    await assert.rejects(recovery.resetPassword(row.request_id, wrong, "reset-test-password-789"), error => error.status === 400);
    const results = await Promise.allSettled([
      recovery.resetPassword(row.request_id, newCode(), "reset-test-password-789"),
      recovery.resetPassword(row.request_id, newCode(), "second-reset-password-123"),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const firstWon = results[0].status === "fulfilled";
    assert.equal(await password.checkPassword(firstWon ? "reset-test-password-789" : "second-reset-password-123"), true);
    assert.equal(await password.checkPassword("changed-test-password-456"), false);
    assert.equal(await auth.validSession(session), false);
    await assert.rejects(recovery.resetPassword(row.request_id, newCode(), "another-password-123"), error => error.status === 400);
    assert.ok(mails.some(mail => mail.subject.includes("Password changed")));
  });
  await t.test("expired codes and five-attempt limit", async () => {
    await unlock();
    let request = await recovery.requestRecovery();
    await storage.database().prepare("UPDATE cms_password_recovery SET expires_at=0").run();
    await assert.rejects(recovery.resetPassword(request.requestId, newCode(), "expired-code-password-123"), error => error.status === 400);
    await unlock();
    request = await recovery.requestRecovery();
    const code = newCode();
    const wrong = code === "00000000" ? "11111111" : "00000000";
    for (let i=0;i<5;i++) await assert.rejects(recovery.resetPassword(request.requestId, wrong, "bad-code-password-123"), error => error.status === 400);
    await assert.rejects(recovery.resetPassword(request.requestId, code, "exhausted-code-password-123"), error => error.status === 400);
  });
  await t.test("failed email cannot activate a code, and email changes revoke earlier codes", async () => {
    await unlock();
    deliveryFails = true;
    await assert.rejects(recovery.requestRecovery(), error => error.status === 502);
    assert.equal(inspector.prepare("SELECT sent FROM cms_password_recovery").get().sent, 0);
    deliveryFails = false;
    await unlock();
    const request = await recovery.requestRecovery();
    const previousEmail = storage.bindings.CMS_ADMIN_EMAIL;
    storage.bindings.CMS_ADMIN_EMAIL = "other-manager@example.com";
    await assert.rejects(recovery.resetPassword(request.requestId, newCode(), "new-email-password-123"), error => error.status === 400);
    storage.bindings.CMS_ADMIN_EMAIL = previousEmail;
  });
  await t.test("changing bootstrap password restores access and revokes sessions", async () => {
    const session = await auth.createSession();
    storage.bindings.CMS_ADMIN_PASSWORD = "new-bootstrap-password-123";
    assert.equal(await password.checkPassword("new-bootstrap-password-123"), true);
    assert.equal(await password.checkPassword("reset-test-password-789"), false);
    assert.equal(await auth.validSession(session), false);
  });
});
