import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { AdminLink } from "@/components/profile/AdminLink";
import { GroupPanel } from "@/components/profile/GroupPanel";
import { InviteFriends } from "@/components/profile/InviteFriends";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "Profile"
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="pb-5 pt-2">
        <div className="flex items-end justify-between gap-4">
          <h1 className="table-wordmark text-[44px] leading-none text-ink sm:text-[72px]">TABLE</h1>
          <Link
            href="/"
            aria-label="Back to the archive"
            className="tap-scale mb-1 inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-[#fbf9f4] px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink"
          >
            <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.8} />
            Back
          </Link>
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Profile</p>
      </header>
      <ProfileEditor />
      <GroupPanel />
      <InviteFriends />
      <NotificationSettings />
      <AdminLink />
    </div>
  );
}
