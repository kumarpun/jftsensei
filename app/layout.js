import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Nav from "@/components/Nav";
import TopBar from "@/components/TopBar";
import { getUser } from "@/lib/session";
import { unreadCount } from "@/lib/notifications";

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
  const stored = (await cookies()).get("theme")?.value;
  const side = (await cookies()).get("side")?.value === "min" ? "min" : "full";
  const theme = stored === "dark" || stored === "light" ? stored : undefined;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme={theme} data-side={side} suppressHydrationWarning>
      <body>
        <div className={user ? "shell" : undefined}>
          <Nav user={user} collapsed={side === "min"} unread={unread} />
          {user?.role === "admin" ? (
            <div className="main-col">
              <TopBar unread={unread} />
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
