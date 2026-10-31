import { route, json, publicUser } from "@/lib/api";

export const GET = route(async ({ user }) => json({ user: publicUser(user) }));
