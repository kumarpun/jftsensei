import { route, json } from "@/lib/api";
import { screenshotsBlocked } from "@/lib/settings";
import { upcomingOpenings } from "@/lib/openings";

// Public (the login screen needs it before anyone is signed in).
export const GET = route(async () => json({ screenshotsBlocked: await screenshotsBlocked(), openings: (await upcomingOpenings()).map((o) => ({ id: o.id, label: o.label, date: o.date, at: o.at ?? null })) }), { role: null });
