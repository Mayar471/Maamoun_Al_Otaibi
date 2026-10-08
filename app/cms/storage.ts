import { env } from "cloudflare:workers";
import { initialContent, type Content, type Snapshot } from "./model";

export type MediaRow = { id: string; name: string; type: string; size: number; createdAt: string };
export const bindings = env as Cloudflare.Env & { CMS_ADMIN_PASSWORD?: string; CMS_SESSION_SECRET?: string; CMS_ADMIN_EMAIL?: string; RESEND_API_KEY?: string; CMS_EMAIL_FROM?: string };

export function database() {
  if (!bindings.DB) throw new Error("قاعدة بيانات CMS غير متاحة. يجب ربط DB.");
  return bindings.DB;
}

export async function initialize() {
  const db = database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS cms_admin_auth (id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, bootstrap_tag TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_password_recovery (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, code_hash TEXT NOT NULL, auth_tag TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, next_request_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_content (id TEXT PRIMARY KEY, content TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_media (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_login_attempts (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL)"),
  ]);
}

type ContentRow = { content: string; revision: number; updated_at: string };
export async function readSnapshot(draft = false): Promise<Snapshot> {
  await initialize();
  const db = database();
  const published = await db.prepare("SELECT * FROM cms_content WHERE id = 'published'").first<ContentRow>();
  const saved = draft ? await db.prepare("SELECT * FROM cms_content WHERE id = 'draft'").first<ContentRow>() : published;
  return { content: saved ? JSON.parse(saved.content) : published ? JSON.parse(published.content) : structuredClone(initialContent), revision: draft ? saved?.revision ?? 0 : published?.revision ?? 0, updatedAt: saved?.updated_at ?? null, publishedAt: published?.updated_at ?? null };
}

export async function saveDraft(content: Content, revision: number) {
  await initialize();
  const encoded = JSON.stringify(content);
  const timestamp = new Date().toISOString();
  const result = revision === 0
    ? await database().prepare("INSERT INTO cms_content (id, content, revision, updated_at) VALUES ('draft', ?, 1, ?) ON CONFLICT(id) DO NOTHING").bind(encoded, timestamp).run()
    : await database().prepare("UPDATE cms_content SET content = ?, revision = revision + 1, updated_at = ? WHERE id = 'draft' AND revision = ?").bind(encoded, timestamp, revision).run();
  if (!result.meta.changes) throw new ConflictError();
  return readSnapshot(true);
}

export async function publishDraft(revision: number) {
  await initialize();
  const result = await database().prepare("INSERT INTO cms_content (id, content, revision, updated_at) SELECT 'published', content, revision, ? FROM cms_content WHERE id = 'draft' AND revision = ? ON CONFLICT(id) DO UPDATE SET content = excluded.content, revision = excluded.revision, updated_at = excluded.updated_at")
    .bind(new Date().toISOString(), revision).run();
  if (!result.meta.changes) throw new ConflictError();
  return readSnapshot(true);
}
export class ConflictError extends Error { constructor() { super("تم تعديل المسودة من جلسة أخرى. أعد تحميل المحتوى قبل الحفظ."); this.name = "ConflictError"; } }

export async function listMedia(): Promise<MediaRow[]> {
  await initialize();
  const statement = database().prepare("SELECT id, name, type, size, created_at AS createdAt FROM cms_media ORDER BY created_at DESC LIMIT 500");
  return (await statement.all<MediaRow>()).results;
}
export function mediaBucket() {
  if (!bindings.MEDIA) throw new Error("تخزين الصور غير متاح. يجب ربط MEDIA.");
  return bindings.MEDIA;
}

export async function allowRate(id: string, limit: number, windowMs: number) {
  await initialize();
  const now = Date.now();
  // A durable global limit also protects local previews where trusted client IPs are unavailable.
  const result = await database().prepare("INSERT INTO cms_login_attempts (id, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = CASE WHEN expires_at < ? THEN 1 ELSE attempts + 1 END, expires_at = CASE WHEN expires_at < ? THEN excluded.expires_at ELSE expires_at END RETURNING attempts")
    .bind(id, now + windowMs, now, now).first<{ attempts: number }>();
  return (result?.attempts ?? limit + 1) <= limit;
}

export function allowLogin() { return allowRate("admin", 10, 15 * 60 * 1000); }
