import { route, json } from "@/lib/api";
import { screenshotsBlocked, openingDate } from "@/lib/settings";

// Public (the login screen needs it before anyone is signed in).
export const GET = route(async () => json({ screenshotsBlocked: await screenshotsBlocked(), opening: await openingDate() }), { role: null });
