import { api, ApiError, checkOrigin, checkPassword, COOKIE, json, readJson, requireAdmin } from "../../../cms/auth";
import { passwordContext, replacePassword, validNewPassword } from "../../../cms/password";
import { requestRecovery, resetPassword } from "../../../cms/recovery";
import { allowRate } from "../../../cms/storage";
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const data = await readJson(request, 4096);
    if (data.action === "request") return json(await requestRecovery());
    if (data.action !== "reset" && data.action !== "change") throw new ApiError("طلب غير صالح.", 400);
    if (!validNewPassword(data.password) || data.password !== data.confirmPassword) throw new ApiError("كلمة المرور يجب أن تكون من 12 إلى 128 محرفاً وأن تتطابق مع التأكيد.", 400);
    if (data.action === "reset") {
      if (typeof data.requestId !== "string" || !/^[\da-f-]{36}$/.test(data.requestId) || typeof data.code !== "string" || !/^\d{8}$/.test(data.code)) throw new ApiError("الكود غير صحيح أو انتهت صلاحيته. اطلب كوداً جديداً.", 400);
      await resetPassword(data.requestId, data.code, data.password);
    } else {
      await requireAdmin(request, true);
      if (!await allowRate("password-change", 5, 15 * 60 * 1000)) throw new ApiError("محاولات كثيرة. حاول بعد 15 دقيقة.", 429);
      const context = await passwordContext();
      if (typeof data.currentPassword !== "string" || !await checkPassword(data.currentPassword)) throw new ApiError("كلمة المرور غير صحيحة.", 401);
      if (!await replacePassword(data.password, context)) throw new ApiError("تغيّرت كلمة المرور. أعد تسجيل الدخول.", 409);
    }
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (new URL(request.url).protocol === "https:" ? "; Secure" : ""));
    return response;
  }, request);
}
