"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingAddButton } from "@/components/navigation/FloatingAddButton";
import { LocalArchiveSync } from "@/components/sync/LocalArchiveSync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");
  const isRecipes = pathname.startsWith("/recipes");

  if (isLogin) {
    return <main>{children}</main>;
  }

  return (
    <div className={isRecipes ? "h-dvh overflow-hidden pt-5 sm:pt-8" : "min-h-dvh pb-28 pt-5 sm:pt-8"}>
      <LocalArchiveSync />
      <main className={isRecipes ? "h-full overflow-hidden" : undefined}>{children}</main>
      <FloatingAddButton />
      <BottomNav />
    </div>
  );
}
