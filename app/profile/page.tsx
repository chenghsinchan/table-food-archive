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
      <header className="space-y-3 pb-1 pt-2">
        <Link
          href="/"
          aria-label="Back to the archive"
          className="tap-scale inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-[#fbf9f4] px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink"
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.8} />
          Back
        </Link>
        <p className="text-xs font-semibold uppercase text-muted">PROFILE</p>
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Table Owner
        </h1>
      </header>
      <ProfileEditor />
      <GroupPanel />
      <InviteFriends />
      <NotificationSettings />
      <AdminLink />
    </div>
  );
}
