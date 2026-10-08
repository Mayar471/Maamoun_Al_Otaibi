"use client";
import { usePreferences } from "./Preferences";
export default function PreviewBanner({ visible }: { visible: boolean }) {
  const { language, t } = usePreferences();
  return visible ? <aside className="cms-preview-banner" lang={language} dir={language === "ar" ? "rtl" : "ltr"}>{t("معاينة المسودة — الزوار يشاهدون النسخة المنشورة.")} <a href="/admin">{t("العودة إلى لوحة التحكم")}</a></aside> : null;
}
