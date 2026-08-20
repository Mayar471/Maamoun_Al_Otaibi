import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Montserrat({ variable: "--font-sans", subsets: ["latin"], weight: ["300", "400", "500", "600"] });

const siteTitle = "Ma’amoun Al Otaibi";
const siteDescription = "Entrepreneur, author, and creator building businesses and original intellectual properties across industries.";

export const metadata: Metadata = {
  metadataBase: new URL("https://maamoun-al-otaibi.onrender.com"),
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
      url: "/og.png",
      width: 1728,
      height: 904,
      alt: "Ma’amoun Al Otaibi — Entrepreneur, Author, Creator",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>; }
