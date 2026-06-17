"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", label: "Home", icon: Circle },
  { href: "/tonight", label: "Tonight", icon: Star },
  { href: "/love", label: "Love", icon: Heart }
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
      className="liquid-island fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(calc(100%_-_2rem),390px)] -translate-x-1/2 items-center justify-between rounded-[34px] p-2"
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
              "tap-scale relative z-10 flex min-h-12 flex-1 items-center justify-center rounded-full px-2 text-muted transition",
              active && "bg-white/86 text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.7} fill={item.href === "/love" && active ? "currentColor" : "none"} />
          </Link>
        );
      })}
    </nav>
  );
}
