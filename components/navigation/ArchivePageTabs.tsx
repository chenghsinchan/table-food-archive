"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/sunday", label: "Sunday" }
];

export function ArchivePageTabs() {
  const pathname = usePathname();

  return (
    <nav className="archive-page-tabs" aria-label="Archive sections">
      {tabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className={cn("archive-page-tab tap-scale", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
