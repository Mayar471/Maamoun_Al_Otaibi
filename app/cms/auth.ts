import { cookies } from "next/headers";
import { bindings } from "./storage";

export const COOKIE = "maamoun_cms";
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");

export function credentials() {
  const password = bindings.CMS_ADMIN_PASSWORD ?? process.env.CMS_ADMIN_PASSWORD;
  const secret = bindings.CMS_SESSION_SECRET ?? process.env.CMS_SESSION_SECRET;
  if (!password || password.length < 12 || !secret || secret.length < 32) return null;
  return { password, secret };
}
async function key() {
  const config = credentials();
  if (!config) throw new Error("تسجيل الدخول غير مهيّأ. اضبط كلمة المرور وسر الجلسة في إعدادات السيرفر.");
  // Password changes invalidate existing sessions as well as secret changes.
  return crypto.subtle.importKey("raw", encoder.encode(`${config.secret}:${config.password}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function checkPassword(value: string) {
  const config = credentials();
  if (!config) return false;
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(config.password));
  return crypto.subtle.verify("HMAC", await key(), signature, encoder.encode(value));
}
export async function createSession() {
  const value = `${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${crypto.randomUUID()}`;
  return `${value}.${hex(await crypto.subtle.sign("HMAC", await key(), encoder.encode(value)))}`;
}
export async function validSession(token?: string) {
  if (!token || !credentials()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[\da-f]{64}$/.test(parts[2])) return false;
  const expiry = Number(parts[0]);
  const now = Math.floor(Date.now() / 1000);
  if (expiry <= now || expiry > now + SESSION_SECONDS) return false;
  const bytes = new Uint8Array(parts[2].match(/../g)!.map(part => parseInt(part, 16)));
  return crypto.subtle.verify("HMAC", await key(), bytes, encoder.encode(`${parts[0]}.${parts[1]}`));
}
export async function isAdmin() { return validSession((await cookies()).get(COOKIE)?.value); }

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApiError("مصدر الطلب غير مسموح.", 403);
}
export async function requireAdmin(request: Request, write = false) {
  if (write) checkOrigin(request);
  const token = request.headers.get("cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!await validSession(token)) throw new ApiError("سجّل الدخول للمتابعة.", 401);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store",
    // Close a Node connection when rejecting a body before its upload completes.
    ...(status === 413 && process.env.CMS_STORAGE_DRIVER === "node" ? { Connection: "close" } : {}),
  } });
}
export async function readBody(request: Request, limit: number, drainSmallOverflow = false): Promise<Uint8Array<ArrayBuffer>> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      // Finish a small rejected upload without buffering it, so Node can deliver
      // the 413 before closing the connection. Larger overflows are canceled.
      if (drainSmallOverflow && size <= limit + 1_048_576) { chunks.length = 0; continue; }
      void reader.cancel().catch(() => {});
      throw new ApiError("حجم الطلب يتجاوز الحد المسموح.", 413);
    }
    chunks.push(value);
  }
  if (size > limit) throw new ApiError("حجم الطلب يتجاوز الحد المسموح.", 413);
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
export async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  const body = await readBody(request, limit);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(body)); } catch { throw new ApiError("طلب غير صالح.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError("طلب غير صالح.", 400);
  return value as Record<string, unknown>;
}
export async function api(action: () => Promise<Response>, request?: Request) {
  try { return await action(); } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof Error && error.name === "ConflictError") return json({ error: error.message }, 409);
    console.error("CMS request failed", error);
    return json({ error: "تعذّر إكمال الطلب. تحقق من إعدادات التخزين وحاول مجدداً." }, 500);
  } finally {
    // Vinext's Node adapter pauses unread request streams. Canceling resumes and
    // drains them so an early rejection cannot stall the next keep-alive request.
    if (request?.body && !request.bodyUsed && !request.body.locked) void request.body.cancel().catch(() => {});
  }
}
