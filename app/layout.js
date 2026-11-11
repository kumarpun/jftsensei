import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Nav from "@/components/Nav";
import { getUser } from "@/lib/session";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "JFTSENSEI",
  description: "JFT-Basic online mock test platform",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const user = await getUser();
  const stored = (await cookies()).get("theme")?.value;
  const side = (await cookies()).get("side")?.value === "min" ? "min" : "full";
  const theme = stored === "dark" || stored === "light" ? stored : undefined;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme={theme} data-side={side} suppressHydrationWarning>
      <body>
        <div className={user ? "shell" : undefined}>
          <Nav user={user} collapsed={side === "min"} />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
