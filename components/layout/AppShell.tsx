"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { BottomNav } from "@/components/navigation/BottomNav";
import { FloatingAddButton } from "@/components/navigation/FloatingAddButton";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");

  if (isLogin) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-dvh pb-28 pt-5 sm:pt-8">
      <AuthGate>
        <main>{children}</main>
        <FloatingAddButton />
        <BottomNav />
      </AuthGate>
    </div>
  );
}
