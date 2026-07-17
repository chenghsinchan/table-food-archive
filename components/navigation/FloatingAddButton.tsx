"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

export function FloatingAddButton() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/add" || pathname === "/tonight" || pathname === "/love") {
    return null;
  }

  const returnTo = "/";

  return (
    <Link
      href={`/add?returnTo=${encodeURIComponent(returnTo)}`}
      className="tap-scale fixed bottom-[4.15rem] right-3 z-40 grid size-11 place-items-center rounded-[12px] border border-border bg-[#fbf9f4]/96 text-ink shadow-[0_8px_24px_rgba(26,24,23,0.12)] outline-none backdrop-blur-md lg:right-[max(1.5rem,calc((100vw_-_1180px)/2))]"
      aria-label="Add a food memory"
    >
      <Plus aria-hidden="true" size={21} strokeWidth={1.7} />
    </Link>
  );
}
