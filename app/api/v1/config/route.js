import { route, json } from "@/lib/api";
import { screenshotsBlocked } from "@/lib/settings";

// Public (the login screen needs it before anyone is signed in).
export const GET = route(async () => json({ screenshotsBlocked: await screenshotsBlocked() }), { role: null });
