import { bindings, database, initialize } from "./storage";
const encoder = new TextEncoder();
export const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
export function credentials() {
  const password = bindings.CMS_ADMIN_PASSWORD ?? process.env.CMS_ADMIN_PASSWORD;
  const secret = bindings.CMS_SESSION_SECRET ?? process.env.CMS_SESSION_SECRET;
  if (!password || password.length < 12 || !secret || secret.length < 32) return null;
  return { password, secret };
}
export async function digest(value: string) {
  const config = credentials();
  if (!config) throw new Error("CMS credentials are not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(config.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return different === 0;
}
export async function passwordContext() {
  const config = credentials();
  if (!config) throw new Error("CMS credentials are not configured");
  await initialize();
  const bootstrapTag = await digest("bootstrap:" + config.password);
  const row = await database().prepare("SELECT password_hash FROM cms_admin_auth WHERE id = 'admin' AND bootstrap_tag = ?").bind(bootstrapTag).first<{ password_hash: string }>();
  return { ...config, bootstrapTag, storedHash: row?.password_hash ?? "" };
}
// Pepper is kept outside the database. Workers caps each PBKDF2 call at 100,000 iterations.
export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer)) {
  const peppered = await digest("password:" + password);
  const material = await crypto.subtle.importKey("raw", encoder.encode(peppered), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 100000 }, material, 256);
  return "pbkdf2-sha256:100000:" + salt + ":" + hex(result);
}
export async function checkPassword(value: string, knownContext?: Awaited<ReturnType<typeof passwordContext>>) {
  if (!credentials() || value.length > 128) return false;
  const context = knownContext ?? await passwordContext();
  if (!context.storedHash) return equal(await digest("password:" + value), await digest("password:" + context.password));
  const salt = context.storedHash.split(":")[2];
  return !!salt && equal(await hashPassword(value, salt), context.storedHash);
}
export async function sessionKey(knownContext?: Awaited<ReturnType<typeof passwordContext>>) {
  const context = knownContext ?? await passwordContext();
  return crypto.subtle.importKey("raw", encoder.encode(context.secret + ":" + context.bootstrapTag + ":" + context.storedHash), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export function validNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export async function replacePassword(password: string, context: Awaited<ReturnType<typeof passwordContext>>) {
  const hash = await hashPassword(password);
  const result = await database().batch([
    database().prepare("INSERT INTO cms_admin_auth (id, password_hash, bootstrap_tag) SELECT 'admin', ?, ? WHERE COALESCE((SELECT password_hash FROM cms_admin_auth WHERE id = 'admin' AND bootstrap_tag = ?), '') = ? ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, bootstrap_tag = excluded.bootstrap_tag").bind(hash, context.bootstrapTag, context.bootstrapTag, context.storedHash),
    database().prepare("DELETE FROM cms_password_recovery WHERE EXISTS (SELECT 1 FROM cms_admin_auth WHERE id = 'admin' AND password_hash = ?)").bind(hash),
  ]);
  return !!result[0].meta.changes;
}
