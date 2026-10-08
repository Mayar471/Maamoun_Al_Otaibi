// Node deployment adapter selected by CMS_STORAGE_DRIVER=node in vite.config.ts.
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dataDirectory = resolve(process.env.CMS_DATA_DIR ?? ".cms-data");
mkdirSync(dataDirectory, { recursive: true });
const sqlite = new DatabaseSync(resolve(dataDirectory, "content.sqlite"));
sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");

class Statement {
  private values: (string | number | null)[] = [];
  constructor(private sql: string) {}
  bind(...values: (string | number | null)[]) { const statement = new Statement(this.sql); statement.values = values; return statement; }
  async first<T>(): Promise<T | null> { return (sqlite.prepare(this.sql).get(...this.values) as T | undefined) ?? null; }
  async all<T>(): Promise<{ results: T[] }> { return { results: sqlite.prepare(this.sql).all(...this.values) as T[] }; }
  execute() { return { meta: { changes: Number(sqlite.prepare(this.sql).run(...this.values).changes) } }; }
  async run() { return this.execute(); }
}

const DB = {
  prepare(sql: string) { return new Statement(sql); },
  async batch(statements: Statement[]) {
    sqlite.exec("BEGIN IMMEDIATE");
    try { const results = statements.map(statement => statement.execute()); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  },
};
function mediaPath(key: string) {
  if (!/^[\da-f-]{36}$/.test(key)) throw new Error("Invalid image key");
  return resolve(dataDirectory, "media", key);
}
const MEDIA = {
  async put(key: string, buffer: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
    await mkdir(resolve(dataDirectory, "media"), { recursive: true });
    await writeFile(mediaPath(key), new Uint8Array(buffer));
    await writeFile(mediaPath(key) + ".json", JSON.stringify(options.httpMetadata));
  },
  async get(key: string) {
    try {
      const [buffer, metadata] = await Promise.all([readFile(mediaPath(key)), readFile(mediaPath(key) + ".json", "utf8")]);
      return { body: new Response(buffer).body!, httpMetadata: JSON.parse(metadata) as { contentType: string } };
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  },
  async delete(key: string) {
    for (const path of [mediaPath(key), mediaPath(key) + ".json"]) { try { await unlink(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
  },
};

// Local credentials are read without logging them. Production uses environment variables.
let localSecrets: Record<string, string> = {};
if (process.env.NODE_ENV !== "production") {
  try { localSecrets = Object.fromEntries(readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const split = line.indexOf("="); return [line.slice(0, split), line.slice(split + 1).trim()]; })); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
export const env = { DB, MEDIA, CMS_ADMIN_EMAIL: process.env.CMS_ADMIN_EMAIL ?? localSecrets.CMS_ADMIN_EMAIL, RESEND_API_KEY: process.env.RESEND_API_KEY ?? localSecrets.RESEND_API_KEY, CMS_EMAIL_FROM: process.env.CMS_EMAIL_FROM ?? localSecrets.CMS_EMAIL_FROM, CMS_ADMIN_PASSWORD: process.env.CMS_ADMIN_PASSWORD ?? localSecrets.CMS_ADMIN_PASSWORD, CMS_SESSION_SECRET: process.env.CMS_SESSION_SECRET ?? localSecrets.CMS_SESSION_SECRET };
