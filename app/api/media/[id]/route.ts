import { mediaBucket } from "../../../cms/storage";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(id)) return new Response("Not found", { status: 404 });
  const file = await mediaBucket().get(id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, { headers: { "Content-Type": file.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
