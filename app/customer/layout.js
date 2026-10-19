import { requireRole } from "@/lib/session";

export default async function CustomerLayout({ children }) {
  await requireRole("customer");
  return children;
}
