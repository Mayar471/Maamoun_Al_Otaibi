import type { Metadata } from "next";
import { credentials, isAdmin } from "../cms/auth";
import { readSnapshot } from "../cms/storage";
import Dashboard from "./Dashboard";
import Login from "./Login";
import "./admin.css";
import "./appearance.css";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await cookies()).get("cms-language")?.value === "en" ? "Content management" : "إدارة المحتوى", robots: { index: false, follow: false } };
}
export default async function Admin() {
  const configured = !!credentials();
  if (!configured || !await isAdmin()) return <Login configured={configured} />;
  return <Dashboard initial={await readSnapshot(true)} />;
}
