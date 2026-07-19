import type { Metadata } from "next";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { AdminLink } from "@/components/profile/AdminLink";
import { GroupPanel } from "@/components/profile/GroupPanel";
import { InviteFriends } from "@/components/profile/InviteFriends";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { LanguageSettings } from "@/components/settings/LanguageSettings";

export const metadata: Metadata = {
  title: "Profile"
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <ProfileHeader />
      <ProfileEditor />
      <GroupPanel />
      <InviteFriends />
      <LanguageSettings />
      <NotificationSettings />
      <AdminLink />
    </div>
  );
}
