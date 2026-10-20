import { queryOne } from "@/lib/db";
import { getUser } from "@/lib/session";

export async function GET(_req, { params }) {
  if (!(await getUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const hosted = await queryOne("SELECT image_url FROM questions WHERE id = ?", [Number(id)]);
  if (hosted?.image_url) return new Response(null, { status: 302, headers: { Location: hosted.image_url, "Cache-Control": "no-store" } });
  const img = await queryOne("SELECT mime, data FROM question_images WHERE question_id = ?", [Number(id)]);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img.data, {
    headers: { "Content-Type": img.mime, "Cache-Control": "private, max-age=3600" },
  });
}
