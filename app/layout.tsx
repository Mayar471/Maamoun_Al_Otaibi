import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Montserrat({ variable: "--font-sans", subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export const metadata: Metadata = { title: { default: "Ma’amoun Al Otaibi", template: "%s | Ma’amoun Al Otaibi" }, description: "Entrepreneur, author, and creator building businesses and original intellectual properties across industries." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>; }
