"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", label: "HOME", icon: House },
  { href: "/recipes", label: "RECIPES", icon: BookOpen },
  { href: "/tonight", label: "TONIGHT", icon: Sparkles }
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
            onClick={() => setActiveHref(item.href)}
            className={cn(
              "tap-scale relative z-10 flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[11px] font-semibold text-muted transition",
              active && "bg-white/86 text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
