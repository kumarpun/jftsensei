"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

// 24x24 stroke icon paths.
const ICON = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  cart: "M3 4h2l2.4 11h10.2L20 7H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z",
  users: "M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3",
  bell: "M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21h4",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
};

const LINKS = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: "chart" },
    { href: "/admin", label: "Sets", icon: "list" },
    { href: "/admin/packages", label: "Purchases", icon: "cart" },
    { href: "/admin/customers", label: "Customers", icon: "users" },
    { href: "/admin/results", label: "Results", icon: "trophy" },
    { href: "/admin/announcements", label: "Announcements", icon: "list" },
    { href: "/admin/settings", label: "Settings", icon: "gear" },
  ],
  customer: [
    { href: "/customer", label: "Free sets", icon: "list" },
    { href: "/customer/my-packages", label: "My packages", icon: "box" },
    { href: "/customer/packages", label: "Buy packages", icon: "cart" },
    { href: "/customer/announcements", label: "Announcements", icon: "bell" },
    { href: "/customer/results", label: "My results", icon: "trophy" },
  ],
};

const Icon = ({ name }) => (
  <svg className="side-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[name]} /></svg>
);

const Brand = ({ href, onClick }) => (
  <Link href={href} className="brand" onClick={onClick}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logo.jpg" alt="" className="brand-logo" />
    <span className="side-text">JFTSENSEI</span>
  </Link>
);

const Burger = ({ open, onClick }) => (
  <button className="nav-toggle" aria-label="Menu" aria-expanded={open} onClick={onClick}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  </button>
);

export default function Nav({ user, collapsed: initial = false }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initial);

  // Desktop: collapse the sidebar to an icon rail. Saved in a cookie so the server renders it without a flash.
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.side = next ? "min" : "full";
    document.cookie = `side=${next ? "min" : "full"}; path=/; max-age=31536000; samesite=lax`;
  };
  const pathname = usePathname();

  // Signed-out visitors keep a simple top bar.
  if (!user) {
    return (
      <nav className="nav">
        <div className="nav-inner">
          <Brand href="/" />
          <ThemeToggle />
          <Burger open={open} onClick={() => setOpen((o) => !o)} />
          <div className={`nav-panel ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
            <div className="nav-links" />
            <div className="nav-right">
              <Link href="/login" className="btn sm">Login</Link>
              <Link href="/signup" className="btn sm primary">Sign up</Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const home = user.role === "admin" ? "/admin/dashboard" : "/customer";
  const links = LINKS[user.role] || [];
  const isActive = (l) => {
    if (l.href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/tests");
    if (l.href === "/customer") return pathname === "/customer" || pathname.startsWith("/customer/test");
    return pathname.startsWith(l.href);
  };

  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <div className="side-top">
        <Brand href={home} onClick={() => setOpen(false)} />
        <button type="button" className="side-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleCollapsed}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" />{collapsed ? <path d="M14 10l2 2-2 2" /> : <path d="M16 10l-2 2 2 2" />}
          </svg>
        </button>
        <Burger open={open} onClick={() => setOpen((o) => !o)} />
      </div>
      <div className="side-panel">
        <div className="side-label side-text">{user.role === "admin" ? "Admin" : "Menu"}</div>
        <nav className="side-links" onClick={() => setOpen(false)}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} title={l.label} className={`side-link ${isActive(l) ? "active" : ""}`} aria-current={isActive(l) ? "page" : undefined}>
              <Icon name={l.icon} /><span className="side-text">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
