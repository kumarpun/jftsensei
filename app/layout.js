import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Nav from "@/components/Nav";
import TopBar from "@/components/TopBar";
import { getUser } from "@/lib/session";
import { unreadCount, listNotifications } from "@/lib/notifications";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "JFTSENSEI",
  description: "JFT-Basic online mock test platform",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const user = await getUser();
  const unread = user?.role === "admin" ? await unreadCount("admin", null).catch(() => 0) : 0;
  const recent = user?.role === "admin" ? await listNotifications("admin", null, 8).catch(() => []) : [];
  const stored = (await cookies()).get("theme")?.value;
  const side = (await cookies()).get("side")?.value === "min" ? "min" : "full";
  const theme = stored === "dark" || stored === "light" ? stored : undefined;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme={theme} data-side={side} suppressHydrationWarning>
      <body>
        <div className={user ? (user.role === "customer" ? "shell no-side" : "shell") : undefined}>
          {user?.role !== "customer" && <Nav user={user} collapsed={side === "min"} unread={unread} />}
          {user ? (
            <div className="main-col">
              <TopBar user={user} unread={unread} recent={recent.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, is_read: !!n.is_read, at: new Date(n.created_at).toISOString() }))} />
              <main className="container">{children}</main>
            </div>
          ) : (
            <main className="container">{children}</main>
          )}
        </div>
      </body>
    </html>
  );
}
