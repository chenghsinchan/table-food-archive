"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// TONIGHT and LOVE are hidden from the nav for now (pages still exist).
const items = [
  { href: "/", label: "Home", icon: Circle },
  { href: "/sunday", label: "Sunday", icon: Sun }
];

export function BottomNav() {
  const pathname = usePathname();
  const [activeHref, setActiveHref] = useState(pathname);

  useEffect(() => {
    setActiveHref(pathname);
  }, [pathname]);

  return (
    <nav
      aria-label="Main navigation"
      className="liquid-island fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-auto max-w-[calc(100%_-_2rem)] -translate-x-1/2 items-center justify-center gap-1 rounded-[34px] p-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          activeHref === item.href ||
          (item.href !== "/" && activeHref.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            title={item.label}
            aria-label={item.label}
            onClick={() => setActiveHref(item.href)}
            className={cn(
              "tap-scale relative z-10 flex items-center justify-center rounded-full p-3 text-muted transition",
              active && "bg-ink/[0.07] text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.7} fill={active ? "currentColor" : "none"} />
          </Link>
        );
      })}
    </nav>
  );
}
