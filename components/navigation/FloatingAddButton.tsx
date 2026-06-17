"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

export function FloatingAddButton() {
  const pathname = usePathname();

  if (pathname === "/add" || pathname === "/tonight" || pathname === "/love") {
    return null;
  }

  const returnTo = "/";

  return (
    <Link
      href={`/add?returnTo=${encodeURIComponent(returnTo)}`}
      className="tap-scale fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full border-0 bg-ink text-white shadow-soft outline-none lg:right-[max(1.5rem,calc((100vw_-_1180px)/2))]"
      aria-label="Add a food memory"
    >
      <Plus aria-hidden="true" size={26} strokeWidth={1.8} />
    </Link>
  );
}
