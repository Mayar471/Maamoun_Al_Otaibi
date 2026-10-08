"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation matches the existing Vinext site. */
import { useState, type FormEvent } from "react";
import { CmsPreferences, usePreferences } from "../components/Preferences";
import { translateError } from "../cms/translations";
import { PasswordRecovery } from "./PasswordControls";
export default function Login({ configured, recoveryEnabled }: {
    configured: boolean;
    recoveryEnabled: boolean;
}) {
    const { language, t } = usePreferences();
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        const password = new FormData(event.currentTarget).get("password");
        try {
            const response = await fetch("/api/cms/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
            const data = await response.json() as {
                error?: string;
            };
            if (!response.ok)
                throw new Error(data.error);
            window.location.reload();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "تعذر الاتصال بالسيرفر.");
            setBusy(false);
        }
    }
    return <main className="cms-login cms" dir={language === "ar" ? "rtl" : "ltr"} lang={language}><section><CmsPreferences /><span className="cms-monogram">M</span><p className="cms-eyebrow">{t("مأمون العتيبي")}</p><h1>{t("مساحة إدارة المحتوى")}</h1><p>{t("الكلمات، المشاريع، والأفكار.")}<br />{t("كل تفاصيل الموقع من مكان واحد.")}</p>{configured ? <form onSubmit={submit}><label>{t("كلمة المرور")}<input type="password" name="password" autoComplete="current-password" required minLength={12} disabled={busy}/></label><button className="cms-primary" disabled={busy}>{busy ? t("جارٍ تسجيل الدخول…") : t("الدخول إلى لوحة التحكم ←")}</button></form> : <div className="cms-notice">{t("لوحة التحكم بحاجة إلى إعداد بيانات الدخول على السيرفر. راجع ملف CMS.md لتعيين كلمة المرور وسر الجلسة.")}</div>}{configured && <PasswordRecovery enabled={recoveryEnabled} />}<p role="alert" className="cms-error">{translateError(error, language)}</p><a className="cms-back" href="/">{t("العودة إلى الموقع ↗")}</a></section></main>;
}
