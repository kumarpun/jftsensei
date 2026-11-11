"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/actions";

const currentTheme = () =>
  document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

// Avatar dropdown: change password, dark theme switch, logout.
export default function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleOpen() {
    if (!open) setDark(currentTheme() === "dark");
    setOpen((o) => !o);
  }

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setDark(!dark);
  }

  return (
    <div className="profile">
      <button type="button" className="profile-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Profile menu" onClick={toggleOpen}>
        <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
        <span className="who side-text">{user.name}</span>
        <svg className={`chev side-text ${open ? "up" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="setmenu-list" role="menu">
            <div className="profile-head">
              <span className="avatar lg">{user.name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <span className="role-badge">{user.role}</span>
              </div>
            </div>
            <div className="menu-sep" />
            <Link href="/account/password" role="menuitem" onClick={() => setOpen(false)}><span className="mi">🔑</span>Change password</Link>
            <button type="button" role="menuitemcheckbox" aria-checked={dark} onClick={toggleTheme}>
              <span className="mi">🌙</span>Dark theme<span className={`switch ${dark ? "on" : ""}`} />
            </button>
            <div className="menu-sep" />
            <form action={logout}><button role="menuitem" className="menu-danger"><span className="mi">⎋</span>Logout</button></form>
          </div>
        </>
      )}
    </div>
  );
}
