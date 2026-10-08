import { api, ApiError, json, readJson, requireAdmin } from "../../../cms/auth";
import { validateContent } from "../../../cms/model";
import { publishDraft, readSnapshot, saveDraft } from "../../../cms/storage";

export async function GET(request: Request) { return api(async () => { await requireAdmin(request); return json(await readSnapshot(true)); }, request); }
export async function PUT(request: Request) {
  return api(async () => {
    await requireAdmin(request, true);
    const data = await readJson(request, 2_000_000);
    try { validateContent(data.content); } catch (error) { throw new ApiError(error instanceof Error ? error.message : "محتوى غير صالح.", 400); }
    if (typeof data.revision !== "number" || !Number.isSafeInteger(data.revision) || data.revision < 0) throw new ApiError("نسخة غير صالحة.", 400);
    return json(await saveDraft(data.content, data.revision));
  }, request);
}
export async function POST(request: Request) {
  return api(async () => {
    await requireAdmin(request, true);
    const data = await readJson(request, 1024);
    if (typeof data.revision !== "number" || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new ApiError("احفظ المسودة أولاً.", 400);
    return json(await publishDraft(data.revision));
  }, request);
}
