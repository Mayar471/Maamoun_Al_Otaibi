import { api, ApiError, checkOrigin, checkPassword, COOKIE, createSession, credentials, json, readJson, SESSION_SECONDS } from "../../../cms/auth";
import { allowLogin } from "../../../cms/storage";

export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const data = await readJson(request, 2048);
    if (data.action === "logout") {
      const response = json({ ok: true });
      response.headers.set("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
      return response;
    }
    if (!credentials()) throw new ApiError("اضبط CMS_ADMIN_PASSWORD (12 محرفاً على الأقل) وCMS_SESSION_SECRET (32 محرفاً على الأقل) في إعدادات السيرفر.", 503);
    if (!await allowLogin()) throw new ApiError("محاولات كثيرة. حاول بعد 15 دقيقة.", 429);
    const { password } = data;
    if (typeof password !== "string" || !await checkPassword(password)) throw new ApiError("كلمة المرور غير صحيحة.", 401);
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", `${COOKIE}=${await createSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
    return response;
  }, request);
}
