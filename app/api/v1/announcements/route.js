import { query } from "@/lib/db";
import { route, json, announcementImage } from "@/lib/api";

export const GET = route(async () => {
  const items = await query(
    "SELECT id, title, body, has_image, image_url, featured, created_at, 1 AS secs_left FROM announcements WHERE visible = 1 ORDER BY featured DESC, id DESC LIMIT 50"
  );
  return json({
    announcements: items.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      imageUrl: announcementImage(a),
      createdAt: a.created_at,
      featured: !!a.featured,
      secondsLeft: Math.max(0, Number(a.secs_left)),
    })),
  });
});
