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
        <span className="who">{user.name}<small>{user.role}</small></span>
      </button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="setmenu-list" role="menu">
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
