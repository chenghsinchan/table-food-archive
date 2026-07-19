"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { BottomNav } from "@/components/navigation/BottomNav";
import { OnboardingHost } from "@/components/onboarding/OnboardingHost";
import { LocalArchiveSync } from "@/components/sync/LocalArchiveSync";
import { EntryCacheProvider } from "@/lib/entries/EntryCacheProvider";
import { GroupProvider } from "@/lib/groups/GroupProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");
  const isLove = pathname.startsWith("/love");

  if (isLogin) {
    return (
      <LanguageProvider>
        <main>{children}</main>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
    <AuthGate>
      <GroupProvider>
        <EntryCacheProvider>
          <div className={isLove ? "h-dvh overflow-hidden pt-5 sm:pt-8" : "min-h-dvh pb-28 pt-5 sm:pt-8"}>
            <LocalArchiveSync />
            <main className={isLove ? "h-full overflow-hidden" : undefined}>{children}</main>
            <BottomNav />
          </div>
          <OnboardingHost />
        </EntryCacheProvider>
      </GroupProvider>
    </AuthGate>
    </LanguageProvider>
  );
}
