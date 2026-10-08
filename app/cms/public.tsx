import { isAdmin } from "./auth";
import { readSnapshot } from "./storage";
export type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function pageContent(page: string, props: PageProps) {
  const preview = (await props.searchParams).cmsPreview === "1" && await isAdmin();
  return { page: (await readSnapshot(preview)).content[page], preview };
}
export { default as PreviewBanner } from "../components/PreviewBanner";
