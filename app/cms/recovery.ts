import { ApiError } from "./auth";
import { bindings, database, allowRate, initialize } from "./storage";
import { digest, equal, passwordContext, hashPassword } from "./password";
export function recoveryConfig() {
  const email = (bindings.CMS_ADMIN_EMAIL ?? process.env.CMS_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const apiKey = bindings.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from = bindings.CMS_EMAIL_FROM ?? process.env.CMS_EMAIL_FROM;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && apiKey && from ? { email, apiKey, from } : null;
}
async function sendEmail(subject: string, text: string, id: string) {
  const config = recoveryConfig();
  if (!config) throw new ApiError("استرجاع كلمة المرور عبر البريد غير مهيّأ بعد.", 503);
  // The recipient comes exclusively from server configuration, never from the request.
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify({ from: config.from, to: [config.email], subject, text }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ApiError("تعذّر إرسال البريد. حاول لاحقاً أو تواصل مع مسؤول الموقع.", 502);
}
function randomCode() {
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 4200000000);
  return String(value[0] % 100000000).padStart(8, "0");
}
export async function requestRecovery() {
  const config = recoveryConfig();
  if (!config) throw new ApiError("استرجاع كلمة المرور عبر البريد غير مهيّأ بعد.", 503);
  await initialize();
  if (!await allowRate("recovery-send", 3, 15 * 60 * 1000)) throw new ApiError("محاولات كثيرة. حاول بعد 15 دقيقة.", 429);
  const context = await passwordContext();
  const authTag = await digest("recovery-auth:" + context.bootstrapTag + ":" + context.storedHash + ":" + config.email);
  const id = crypto.randomUUID();
  const code = randomCode();
  const codeHash = await digest("recovery-code:" + id + ":" + code);
  const now = Date.now();
  const reserved = await database().prepare("INSERT INTO cms_password_recovery (id, request_id, code_hash, auth_tag, expires_at, attempts, sent, used, next_request_at) VALUES ('admin', ?, ?, ?, ?, 0, 0, 0, ?) ON CONFLICT(id) DO UPDATE SET request_id=excluded.request_id, code_hash=excluded.code_hash, auth_tag=excluded.auth_tag, expires_at=excluded.expires_at, attempts=0, sent=0, used=0, next_request_at=excluded.next_request_at WHERE next_request_at <= ?").bind(id, codeHash, authTag, now + 10 * 60 * 1000, now + 60000, now).run();
  if (!reserved.meta.changes) throw new ApiError("انتظر دقيقة قبل طلب كود جديد.", 429);
  await sendEmail("CMS — Password reset code / كود استرجاع كلمة المرور", "Your code / الكود: " + code + "\n\nValid for 10 minutes, one use only. / صالح لمدة 10 دقائق ولمرة واحدة.\nIf you did not request this, ignore this email. / إذا لم تطلبه، تجاهل الرسالة.", "cms-recovery/" + id);
  await database().prepare("UPDATE cms_password_recovery SET sent=1 WHERE id='admin' AND request_id=?").bind(id).run();
  return { requestId: id };
}
type Challenge = { request_id: string; code_hash: string; auth_tag: string; attempts: number };
export async function resetPassword(requestId: string, code: string, password: string) {
  const config = recoveryConfig();
  if (!config) throw new ApiError("استرجاع كلمة المرور عبر البريد غير مهيّأ بعد.", 503);
  await initialize();
  if (!await allowRate("recovery-verify", 10, 15 * 60 * 1000)) throw new ApiError("محاولات كثيرة. حاول بعد 15 دقيقة.", 429);
  const row = await database().prepare("UPDATE cms_password_recovery SET attempts=attempts+1 WHERE id='admin' AND request_id=? AND used=0 AND sent=1 AND expires_at>? AND attempts<5 RETURNING request_id, code_hash, auth_tag, attempts").bind(requestId, Date.now()).first<Challenge>();
  const codeHash = await digest("recovery-code:" + requestId + ":" + code);
  const context = await passwordContext();
  const authTag = await digest("recovery-auth:" + context.bootstrapTag + ":" + context.storedHash + ":" + config.email);
  if (!row || !equal(row.code_hash, codeHash) || !equal(row.auth_tag, authTag)) throw new ApiError("الكود غير صحيح أو انتهت صلاحيته. اطلب كوداً جديداً.", 400);
  const hash = await hashPassword(password);
  const results = await database().batch([
    database().prepare("INSERT INTO cms_admin_auth (id, password_hash, bootstrap_tag) SELECT 'admin', ?, ? FROM cms_password_recovery WHERE id='admin' AND request_id=? AND code_hash=? AND auth_tag=? AND used=0 AND sent=1 AND expires_at>? AND attempts=? AND COALESCE((SELECT password_hash FROM cms_admin_auth WHERE id='admin' AND bootstrap_tag=?), '')=? ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash, bootstrap_tag=excluded.bootstrap_tag").bind(hash, context.bootstrapTag, requestId, codeHash, authTag, Date.now(), row.attempts, context.bootstrapTag, context.storedHash),
    database().prepare("UPDATE cms_password_recovery SET used=1 WHERE id='admin' AND request_id=? AND EXISTS (SELECT 1 FROM cms_admin_auth WHERE id='admin' AND password_hash=?)").bind(requestId, hash),
  ]);
  if (!results[0].meta.changes) throw new ApiError("الكود غير صحيح أو انتهت صلاحيته. اطلب كوداً جديداً.", 400);
  await database().prepare("DELETE FROM cms_login_attempts WHERE id='admin'").run();
  try { await sendEmail("CMS — Password changed / تم تغيير كلمة المرور", "Your CMS password was changed. If this was not you, contact the site administrator immediately.\nتم تغيير كلمة مرور لوحة التحكم. إذا لم تقم بذلك، تواصل مع مسؤول الموقع فوراً.", "cms-password-changed/" + requestId); } catch { console.error("CMS password change notification could not be delivered"); }
}
