import { requireRole } from "@/lib/session";

export default async function AdminLayout({ children }) {
  await requireRole("admin");
  return children;
}
