"use client";
import { useState, type FormEvent } from "react";
import { usePreferences } from "../components/Preferences";
import { translateError } from "../cms/translations";
async function send(data: Record<string, unknown>) {
  const response = await fetch("/api/cms/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json() as { requestId?: string; error?: string };
  if (!response.ok) throw new Error(result.error ?? "تعذّر إكمال الطلب.");
  return result;
}
function NewPasswordFields({ busy }: { busy: boolean }) {
  const { t } = usePreferences();
  return <><label>{t("كلمة المرور الجديدة")}<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} /></label><label>{t("تأكيد كلمة المرور")}<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} /></label><p className="cms-password-hint">{t("استخدم كلمة مرور من 12 محرفاً على الأقل.")}</p></>;
}
export function PasswordRecovery({ enabled }: { enabled: boolean }) {
  const { t, language } = usePreferences();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function requestCode() {
    setBusy(true); setError("");
    try { const result = await send({ action: "request" }); setRequestId(result.requestId ?? ""); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذّر الاتصال بالسيرفر."); }
    finally { setBusy(false); }
  }
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await send({ ...values, action: "reset", requestId }); setDone(true); setRequestId(""); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذّر الاتصال بالسيرفر."); }
    finally { setBusy(false); }
  }
  return <div className="cms-recovery"><button type="button" className="cms-text-button" aria-expanded={open} onClick={() => { setOpen(!open); setError(""); }}>{t("نسيت كلمة المرور؟")}</button>{open && <div className="cms-recovery-body">{!enabled ? <p>{t("استرجاع كلمة المرور عبر البريد غير متاح حالياً. تواصل مع مسؤول الموقع.")}</p> : done ? <p role="status">{t("تم تغيير كلمة المرور. سجّل الدخول بالكلمة الجديدة.")}</p> : <><p>{t("سنرسل كود تحقق إلى بريد المدير المعتمد فقط.")}</p>{requestId ? <><p role="status">{t("تم إرسال الكود. صلاحيته 10 دقائق، ولمرة واحدة.")}</p><form onSubmit={reset}><label>{t("كود التحقق")}<input name="code" type="text" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required disabled={busy} /></label><NewPasswordFields busy={busy} /><button className="cms-primary" disabled={busy}>{busy ? t("جارٍ الحفظ…") : t("تعيين كلمة المرور الجديدة")}</button></form><button type="button" className="cms-text-button" disabled={busy} onClick={requestCode}>{t("إرسال كود جديد")}</button></> : <button type="button" className="cms-secondary" disabled={busy} onClick={requestCode}>{busy ? t("جارٍ إرسال الكود…") : t("إرسال كود التحقق")}</button>}</>}<p className="cms-error" role="alert">{translateError(error, language)}</p></div>}</div>;
}
export function PasswordSettings({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
  const { t, language } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasUnsavedChanges && !window.confirm(t("تغيير كلمة المرور يسجّل خروجك. لديك تغييرات غير محفوظة. هل تريد المتابعة؟"))) return;
    setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await send({ ...values, action: "change" }); window.location.assign("/admin"); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذّر الاتصال بالسيرفر."); setBusy(false); }
  }
  return <section className="cms-panel cms-password-settings"><details><summary>{t("تغيير كلمة المرور")}</summary><p className="cms-password-hint">{t("بعد التغيير، تنتهي الجلسات القديمة وستسجّل الدخول مجدداً.")}</p><form onSubmit={change}><label>{t("كلمة المرور الحالية")}<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} /></label><NewPasswordFields busy={busy} /><button className="cms-primary" disabled={busy}>{busy ? t("جارٍ الحفظ…") : t("حفظ كلمة المرور")}</button><p className="cms-error" role="alert">{translateError(error, language)}</p></form></details></section>;
}
