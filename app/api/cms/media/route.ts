import { api, ApiError, json, readBody, requireAdmin } from "../../../cms/auth";
import { database, initialize, listMedia, mediaBucket } from "../../../cms/storage";

export async function GET(request: Request) { return api(async () => { await requireAdmin(request); return json(await listMedia()); }, request); }
export async function POST(request: Request) {
  return api(async () => {
    await requireAdmin(request, true);
    const body = await readBody(request, 5_300_000, true);
    let form: FormData;
    try { form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData(); }
    catch { throw new ApiError("طلب رفع صورة غير صالح.", 400); }
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 12 || file.size > 5 * 1024 * 1024) throw new ApiError("اختر صورة حتى 5 MB.", 400);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    const type = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" : bytes.slice(0, 8).join() === "137,80,78,71,13,10,26,10" ? "image/png" : ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP" ? "image/webp" : ["GIF87a", "GIF89a"].includes(ascii(0, 6)) ? "image/gif" : null;
    if (!type || type !== file.type) throw new ApiError("الصور المدعومة: JPG وPNG وWebP وGIF.", 400);
    await initialize();
    const id = crypto.randomUUID();
    const item = { id, name: file.name.slice(0, 180), type, size: file.size, createdAt: new Date().toISOString() };
    await mediaBucket().put(id, buffer, { httpMetadata: { contentType: type } });
    try { await database().prepare("INSERT INTO cms_media (id, name, type, size, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, item.name, type, file.size, item.createdAt).run(); }
    catch (error) { await mediaBucket().delete(id); throw error; }
    return json(item, 201);
  }, request);
}
