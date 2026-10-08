import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import "./themes.css";
import { readSnapshot } from "./cms/storage";
import { cookies } from "next/headers";
import { PreferencesProvider, type Preferences } from "./components/Preferences";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Montserrat({ variable: "--font-sans", subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const settings = (await readSnapshot()).content.settings.fields;
  const siteTitle = settings.title;
  const siteDescription = settings.description;
  return {
  metadataBase: new URL(settings.siteUrl),
  title: { default: siteTitle, template: `%s | ${siteTitle}` },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [{
      url: settings.shareImage,
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: "Ma’amoun Al Otaibi — Entrepreneur, Author, Creator",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [settings.shareImage],
  },
};
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const saved = await cookies();
  const initial: Preferences = {
    language: saved.get("cms-language")?.value === "en" ? "en" : "ar",
    cmsTheme: saved.get("cms-theme")?.value === "dark" ? "dark" : "light",
    siteTheme: saved.get("site-theme")?.value === "light" ? "light" : "dark",
  };
  return <html lang="en" data-site-theme={initial.siteTheme} data-cms-theme={initial.cmsTheme}><body className={`${display.variable} ${sans.variable}`}><PreferencesProvider initial={initial}>{children}</PreferencesProvider></body></html>;
}
