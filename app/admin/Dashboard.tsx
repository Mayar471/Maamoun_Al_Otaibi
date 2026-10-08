"use client";
/* eslint-disable @next/next/no-img-element -- CMS previews use original uploaded images. */
import { useEffect, useState } from "react";
import { definitions, type Content, type RecordItem, type Snapshot } from "../cms/model";
import type { MediaRow } from "../cms/storage";
import { CmsPreferences, usePreferences } from "../components/Preferences";
import { translateError } from "../cms/translations";
import { PasswordSettings } from "./PasswordControls";
type ListDefinition = {
    label: string;
    fields: Record<string, string>;
};
const availableImages = ["/reference/home-hero.jpg", "/images/about-hero-v2.png", "/images/writings-hero-v2.png", "/images/media-hero-v2.png", "/images/contact-hero-v2.png", "/og-share-v2.jpg"];
async function request<T = {
    ok: boolean;
}>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok)
        throw new Error((data as {
            error?: string;
        }).error ?? "تعذّر إكمال الطلب.");
    return data as T;
}
export default function Dashboard({ initial }: {
    initial: Snapshot;
}) {
    const { language, t } = usePreferences();
    const date = (value: string | null) => value ? new Date(value).toLocaleString(language, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }) : t("لم يُحفظ بعد");
    const [snapshot, setSnapshot] = useState(initial);
    const [content, setContent] = useState<Content>(initial.content);
    const [active, setActive] = useState("home");
    const [media, setMedia] = useState<MediaRow[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState<{
        page: string;
        list?: string;
        id?: string;
        key: string;
    } | null>(null);
    const dirty = JSON.stringify(content) !== JSON.stringify(snapshot.content);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if (dirty)
            event.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    async function run(action: () => Promise<void>) {
        setBusy(true);
        setMessage("");
        setError("");
        try {
            await action();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : "تعذّر الاتصال بالسيرفر.");
        }
        finally {
            setBusy(false);
        }
    }
    async function save() {
        const result = await request<Snapshot>("/api/cms/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, revision: snapshot.revision }) });
        setSnapshot(result);
        setContent(result.content);
        return result;
    }
    function field(key: string, value: string, list?: string, id?: string) {
        setContent(current => {
            const next = structuredClone(current);
            if (list) {
                const row = next[active].lists[list].find(item => item.id === id);
                if (row)
                    row[key] = value;
            }
            else
                next[active].fields[key] = value;
            return next;
        });
        setMessage("");
    }
    function editList(key: string, update: (items: RecordItem[]) => RecordItem[]) {
        setContent(current => ({ ...current, [active]: { ...current[active], lists: { ...current[active].lists, [key]: update(current[active].lists[key]) } } }));
    }
    async function openMedia(target?: typeof selectedImage) {
        await run(async () => { setMedia(await request<MediaRow[]>("/api/cms/media")); setSelectedImage(target ?? null); setActive("library"); });
    }
    function chooseImage(url: string) {
        if (!selectedImage)
            return;
        const target = selectedImage;
        setContent(current => {
            const next = structuredClone(current);
            if (target.list) {
                const row = next[target.page].lists[target.list].find(item => item.id === target.id);
                if (row)
                    row[target.key] = url;
            }
            else
                next[target.page].fields[target.key] = url;
            return next;
        });
        setActive(target.page);
        setSelectedImage(null);
        setMessage("تم اختيار الصورة. احفظ المسودة ثم انشر لإظهارها للزوار.");
    }
    function input(key: string, label: string, value: string, list?: string, id?: string) {
        const image = key === "image" || key === "shareImage";
        return <div className={`cms-field ${image ? "cms-image-field" : ""}`} key={key}><label>{t(label)}{["copy", "body", "text", "desc", "title", "journeyTitle"].includes(key) ? <textarea dir="auto" value={value} rows={key === "body" ? 9 : 3} maxLength={key === "body" ? 50000 : 5000} onChange={event => field(key, event.target.value, list, id)}/> : <input dir="auto" value={value} maxLength={5000} onChange={event => field(key, event.target.value, list, id)}/>}</label>{image && <><div className="cms-image-preview">{value ? <img src={value} alt={t(label)}/> : <span>{t("بدون صورة")}</span>}</div><button type="button" className="cms-secondary" onClick={() => openMedia({ page: active, list, id, key })}>{t("اختيار من مكتبة الصور")}</button></>}</div>;
    }
    const definition = definitions[active as keyof typeof definitions];
    const itemsCount = Object.values(content).reduce((total, page) => total + Object.values(page.lists).reduce((count, rows) => count + rows.length, 0), 0);
    return <main className="cms cms-dashboard" dir={language === "ar" ? "rtl" : "ltr"} lang={language}><aside className="cms-sidebar"><a href="/admin" className="cms-brand"><span className="cms-monogram">M</span><span>{t("مأمون العتيبي")}<small>{t("إدارة المحتوى")}</small></span></a><p className="cms-nav-label">{t("مساحة العمل")}</p><nav aria-label={t("أقسام إدارة المحتوى")}>{Object.entries(definitions).map(([key, item], i) => <button disabled={busy} key={key} aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} onClick={() => { setActive(key); setSelectedImage(null); }}><span>{String(i + 1).padStart(2, "0")}</span>{t(item.label)}</button>)}<button disabled={busy} className={active === "library" ? "active" : ""} onClick={() => openMedia()}><span>↥</span>{t("مكتبة الصور")}</button><button disabled={busy} aria-current={active === "security" ? "page" : undefined} className={active === "security" ? "active" : ""} onClick={() => { setActive("security"); setSelectedImage(null); }}><span>&#9919;</span>{t("تغيير كلمة المرور")}</button></nav><div className="cms-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer">{t("زيارة الموقع ↗")}</a><button disabled={busy} onClick={() => run(async () => { if (dirty && !window.confirm(t("لديك تغييرات غير محفوظة. هل تريد تسجيل الخروج؟")))
        return; await request("/api/cms/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); window.location.reload(); })}>{t("تسجيل الخروج")}</button></div></aside><div className="cms-workspace"><header className="cms-topbar"><div><span className="cms-eyebrow">{t("استوديو المحتوى")}</span><h1>{active === "security" ? t("تغيير كلمة المرور") : active === "library" ? t("مكتبة الصور") : t(definition.label)}</h1></div><div className="cms-topbar-options"><CmsPreferences /><div className="cms-status"><i className={dirty ? "unsaved" : ""}/>{dirty ? t("تغييرات غير محفوظة") : t("المسودة محفوظة")}</div></div></header>{active === "security" ? <PasswordSettings hasUnsavedChanges={dirty} /> : <><div className="cms-summary"><div><span>{t("صفحات الموقع")}</span><strong>6</strong></div><div><span>{t("عناصر المحتوى")}</span><strong>{itemsCount}</strong></div><div><span>{t("آخر نشر")}</span><strong className="cms-date">{snapshot.publishedAt ? date(snapshot.publishedAt) : t("المحتوى الأصلي")}</strong></div></div><section className="cms-toolbar"><div><h2>{active === "library" ? t("صورك، في مكان واحد") : t("اصنع النسخة القادمة")}</h2><p>{active === "library" ? t("ارفع صورة ثم اخترها داخل أي صفحة. JPG، PNG، WebP، GIF — حتى 5 MB.") : `${t("آخر حفظ:")} ${date(snapshot.updatedAt)}. ${t("التعديلات لا تظهر للزوار حتى نشرها.")}`}</p></div><div className="cms-actions">{active !== "library" && <button disabled={busy} className="cms-secondary" onClick={() => run(async () => { if (dirty)
        throw new Error(t("احفظ المسودة قبل فتح المعاينة.")); window.open(`${definition.path}?cmsPreview=1`, "_blank", "noopener,noreferrer"); })}>{t("معاينة ↗")}</button>}<button className="cms-secondary" disabled={busy || (!dirty && snapshot.revision > 0)} onClick={() => run(async () => { await save(); setMessage(t("تم حفظ المسودة. النسخة المنشورة لم تتغير.")); })}>{busy ? t("جارٍ العمل…") : t("حفظ المسودة")}</button><button className="cms-primary" disabled={busy || dirty || snapshot.revision === 0} onClick={() => run(async () => { if (!window.confirm(t("نشر المسودة الحالية على الموقع للزوار؟")))
        return; const result = await request<Snapshot>("/api/cms/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: snapshot.revision }) }); setSnapshot(result); setMessage(t("تم النشر. المحتوى الجديد ظاهر الآن على الموقع.")); })}>{t("نشر التغييرات ←")}</button></div></section><p role="status" className="cms-success">{t(message)}</p><p role="alert" className="cms-error">{translateError(error, language)}</p>{active === "library" ? <section className="cms-panel"><div className="cms-panel-heading"><div><h2>{selectedImage ? t("اختر صورة لإضافتها إلى الصفحة") : t("مكتبة الوسائط")}</h2><p>{t("الصور المرفوعة تُحفظ على السيرفر وتبقى متاحة بعد إعادة التشغيل.")}</p></div><label className="cms-upload">{busy ? t("جارٍ الرفع…") : t("＋ رفع صورة")}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file)
        return; run(async () => { if (file.size > 5 * 1024 * 1024)
        throw new Error(t("حجم الصورة الأقصى 5 MB.")); const form = new FormData(); form.set("file", file); const result = await request<MediaRow>("/api/cms/media", { method: "POST", body: form }); setMedia(current => [result, ...current]); setMessage(t("تم رفع الصورة بنجاح.")); }); }}/></label></div><div className="cms-media-grid">{[...media.map(item => ({ url: `/api/media/${item.id}`, name: item.name })), ...availableImages.map(url => ({ url, name: url.split("/").pop()! }))].map(item => <article className="cms-media-card" key={item.url}><img src={item.url} alt={item.name} loading="lazy"/><div><p dir="auto">{item.name}</p>{selectedImage ? <button className="cms-secondary" disabled={busy} onClick={() => chooseImage(item.url)}>{t("استخدام الصورة")}</button> : <button className="cms-secondary" onClick={() => run(async () => { await navigator.clipboard.writeText(item.url); setMessage(t("تم نسخ مسار الصورة.")); })}>{t("نسخ المسار")}</button>}</div></article>)}</div></section> : <fieldset className="cms-editor" disabled={busy}><section className="cms-panel"><div className="cms-panel-heading"><div><h2>{t("محتوى الصفحة")}</h2><p>{t("حرّر النصوص والصور مع الحفاظ على تصميم الموقع.")}</p></div><span className="cms-panel-number">01</span></div><div className="cms-fields">{Object.entries(definition.fields).map(([key, label]) => input(key, label, content[active].fields[key]))}</div></section>{Object.entries(definition.lists).map(([listKey, rawList]) => { const list = rawList as ListDefinition; return <section className="cms-panel" key={listKey}><div className="cms-panel-heading"><div><h2>{t(list.label)}<span className="cms-count">{content[active].lists[listKey].length}</span></h2><p>{t("أضف العناصر، رتّبها، أو احذف ما لم تعد تحتاجه.")}</p></div><button className="cms-secondary" disabled={content[active].lists[listKey].length >= 100} onClick={() => editList(listKey, items => [...items, { id: crypto.randomUUID(), ...Object.fromEntries(Object.keys(list.fields).map(key => [key, ""])) }])}>{t("＋ إضافة عنصر")}</button></div>{content[active].lists[listKey].length === 0 && <p className="cms-empty">{t("لا توجد عناصر بعد. ابدأ بإضافة أول عنصر.")}</p>}{content[active].lists[listKey].map((item, index, items) => <article className="cms-record" key={item.id}><div className="cms-record-heading"><h3>{item.name || item.title || item.label || item.year || `${t("عنصر")} ${index + 1}`}</h3><div><button aria-label={t("نقل للأعلى")} disabled={index === 0} onClick={() => editList(listKey, rows => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</button><button aria-label={t("نقل للأسفل")} disabled={index === items.length - 1} onClick={() => editList(listKey, rows => { const next = [...rows]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}>↓</button><button className="cms-delete" onClick={() => { if (window.confirm(t("حذف هذا العنصر من المسودة؟")))
        editList(listKey, rows => rows.filter(row => row.id !== item.id)); }}>{t("حذف")}</button></div></div><div className="cms-fields">{Object.entries(list.fields).map(([key, label]) => input(key, label, item[key], listKey, item.id))}</div></article>)}</section>; })}</fieldset>}</>}<footer className="cms-footnote">{t("مأمون العتيبي")} · {t("استوديو المحتوى")}<span>{t("المسودات محفوظة بشكل مستقل عن الموقع المنشور")}</span></footer></div></main>;
}
