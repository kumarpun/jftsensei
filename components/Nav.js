"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import ThemeToggle from "./ThemeToggle";

const LINKS = {
  admin: [
    { href: "/admin", label: "Tests", exact: true },
    { href: "/admin/packages", label: "Packages" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/results", label: "Results" },
  ],
  customer: [
    { href: "/customer", label: "Tests", exact: true },
    { href: "/customer/packages", label: "Packages" },
    { href: "/customer/results", label: "My results" },
  ],
};

export default function Nav({ user }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const home = user ? (user.role === "admin" ? "/admin" : "/customer") : "/";
  const links = user ? LINKS[user.role] : [];
  const isActive = (l) => (l.exact ? pathname === l.href || pathname.startsWith(l.href + "/tests") : pathname.startsWith(l.href));

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={home} className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          </span>
          JFTSENSEI
        </Link>
        <ThemeToggle />
        <button className="nav-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <div className={`nav-panel ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          <div className="nav-links">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link ${isActive(l) ? "active" : ""}`}>{l.label}</Link>
            ))}
          </div>
          <div className="nav-right">
            {user ? (
              <>
                <div className="user-chip">
                  <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                  <div>{user.name}<small>{user.role}</small></div>
                </div>
                <form action={logout}><button className="sm">Logout</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn sm primary">Login</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
