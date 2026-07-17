"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname !== "/" && !pathname.startsWith("/sunday")) {
    return null;
  }

  const returnTo = pathname.startsWith("/sunday") ? "/sunday" : "/";

  return (
    <nav
      aria-label="Add a food memory"
      className="fixed bottom-[max(.8rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2"
    >
      <Link
        href={`/add?returnTo=${encodeURIComponent(returnTo)}`}
        prefetch
        title="Add"
        aria-label="Add a food memory"
        className="tap-scale grid size-12 place-items-center rounded-full border border-white/90 bg-black text-white shadow-[0_10px_28px_rgba(26,24,23,0.2)]"
      >
        <Plus aria-hidden="true" size={22} strokeWidth={1.7} />
      </Link>
    </nav>
  );
}
