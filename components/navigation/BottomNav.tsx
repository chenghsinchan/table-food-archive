"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Plus, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils/cn";

type Tab = { href: string; labelKey: TranslationKey; icon: LucideIcon };

const tabs: Tab[] = [
  { href: "/", labelKey: "nav.home", icon: Circle },
  { href: "/sunday", labelKey: "nav.sunday", icon: Sun }
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname !== "/" && !pathname.startsWith("/sunday")) {
    return null;
  }

  const returnTo = pathname.startsWith("/sunday") ? "/sunday" : "/";
  const [home, sunday] = tabs;

  return (
    <nav
      aria-label="Main navigation"
      className="liquid-island fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-[30px] p-2"
    >
      <NavTab tab={home} active={pathname === "/"} />
      <Link
        href={`/add?returnTo=${encodeURIComponent(returnTo)}`}
        prefetch
        aria-label={t("nav.add")}
        className="tap-scale mx-1 grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white shadow-[0_8px_20px_rgba(26,24,23,0.25)]"
      >
        <Plus aria-hidden="true" size={20} strokeWidth={1.8} />
      </Link>
      <NavTab tab={sunday} active={pathname.startsWith("/sunday")} />
    </nav>
  );
}

function NavTab({ tab, active }: { tab: Tab; active: boolean }) {
  const { t } = useLanguage();
  const Icon = tab.icon;

  return (
    <Link
      href={tab.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        // Equal fixed widths keep the + at the exact center of the island
        // (and therefore of the screen, since the island itself is centered).
        "tap-scale flex min-h-11 w-[108px] items-center justify-center gap-2 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] transition",
        active ? "bg-ink/[0.07] text-ink" : "text-muted"
      )}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.7} fill={active ? "currentColor" : "none"} />
      {t(tab.labelKey)}
    </Link>
  );
}
