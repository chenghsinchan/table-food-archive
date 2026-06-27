import type { Metadata } from "next";
import { GroupPanel } from "@/components/profile/GroupPanel";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "Profile"
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="space-y-3 pb-1 pt-2">
        <p className="text-xs font-semibold uppercase text-muted">PROFILE</p>
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Table Owner
        </h1>
      </header>
      <ProfileEditor />
      <GroupPanel />
    </div>
  );
}
