"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { translate, type Language } from "../cms/translations";
export type Theme = "light" | "dark";
export type Preferences = { language: Language; cmsTheme: Theme; siteTheme: Theme };
type ContextValue = Preferences & { setLanguage(value: Language): void; setTheme(scope: "cms" | "site", value: Theme): void; t(text: string): string };
const Context = createContext<ContextValue | null>(null);
function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function PreferencesProvider({ initial, children }: { initial: Preferences; children: ReactNode }) {
  const [preferences, setPreferences] = useState(initial);
  const path = usePathname();
  const admin = path === "/admin" || path.startsWith("/admin/");
  useEffect(() => {
    document.documentElement.dataset.siteTheme = preferences.siteTheme;
    document.documentElement.dataset.cmsTheme = preferences.cmsTheme;
    document.documentElement.lang = admin ? preferences.language : "en";
    document.documentElement.dir = admin && preferences.language === "ar" ? "rtl" : "ltr";
  }, [preferences, admin]);
  const value: ContextValue = {
    ...preferences,
    setLanguage(language) { persist("cms-language", language); setPreferences(current => ({ ...current, language })); },
    setTheme(scope, theme) { persist(`${scope}-theme`, theme); setPreferences(current => ({ ...current, [scope === "cms" ? "cmsTheme" : "siteTheme"]: theme })); },
    t: text => translate(text, preferences.language),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider is required");
  return value;
}
function ThemeIcon({ theme }: { theme: Theme }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{theme === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.8 8.8 0 1 0 20.5 14Z" />}</svg>;
}
export function CmsPreferences() {
  const { language, cmsTheme, setLanguage, setTheme, t } = usePreferences();
  return <div className="cms-preferences"><label className="cms-language"><span>{t("اللغة")}</span><select value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="ar">{t("العربية")}</option><option value="en">{t("الإنكليزية")}</option></select></label><div className="cms-theme-options" role="group" aria-label={t("المظهر")}>{(["light", "dark"] as const).map(theme => <button key={theme} type="button" aria-pressed={cmsTheme === theme} onClick={() => setTheme("cms", theme)}><ThemeIcon theme={theme} /><span>{t(theme === "light" ? "فاتح" : "داكن")}</span></button>)}</div></div>;
}
export function SiteThemeToggle() {
  const { siteTheme, setTheme } = usePreferences();
  const next = siteTheme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} mode`;
  return <button type="button" className="site-theme-toggle" onClick={() => setTheme("site", next)} aria-label={label} title={label}><ThemeIcon theme={next} /></button>;
}
