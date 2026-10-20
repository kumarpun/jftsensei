import Link from "next/link";

const TABS = [
  { href: "/customer/announcements", label: "New announcement" },
  { href: "/customer/my-packages", label: "My Packages" },
  { href: "/customer/packages", label: "Buy Packages" },
  { href: "/customer", label: "Free Sets" },
];

export default function CustomerTabs({ active }) {
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${active === t.href ? "active" : ""}`} aria-current={active === t.href ? "page" : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
