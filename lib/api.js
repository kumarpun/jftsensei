import { getUser } from "@/lib/session";

export const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const fail = (status, message, code) => json({ error: { message, code: code || String(status) } }, status);

// Wraps a route handler: resolves the bearer/cookie user, enforces role, and turns throws into a 500 JSON error.
export function route(handler, { role = "customer" } = {}) {
  return async (req, ctx) => {
    try {
      let user = null;
      if (role) {
        user = await getUser();
        if (!user) return fail(401, "Not signed in or session replaced by a newer login.", "unauthorized");
        if (user.role !== role) return fail(403, "Forbidden.", "forbidden");
      }
      const params = ctx?.params ? await ctx.params : {};
      return await handler({ req, user, params });
    } catch (e) {
      console.error("[api]", req.method, req.url, e);
      return fail(500, "Server error.", "server_error");
    }
  };
}

export async function body(req) {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Question image: external host URL if set, else the authenticated blob route (send the Bearer header when fetching).
export const questionImage = (q) => (q.has_image ? q.image_url || `/img/q/${q.id}` : null);
export const announcementImage = (a) => (a.has_image ? a.image_url || `/img/a/${a.id}` : null);
