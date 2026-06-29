"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type ProfilePreview = {
  name: string;
  avatarUrl?: string;
};

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T"
  );
}

export function ProfileButton() {
  const [profile, setProfile] = useState<ProfilePreview>({ name: "TABLE" });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const localProfile = window.localStorage.getItem("table-profile");
      if (localProfile) {
        const parsedProfile = sanitizeProfile(JSON.parse(localProfile) as ProfilePreview);
        window.localStorage.setItem("table-profile", JSON.stringify(parsedProfile));
        setProfile(parsedProfile);
      }

      const supabase = createClient();
      if (!supabase) {
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("display_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      setProfile({
        name: data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "TABLE",
        avatarUrl: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
      });
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href="/profile"
      aria-label="Open profile"
      title="Profile"
      className="tap-scale block size-12 shrink-0 overflow-hidden rounded-full border border-border bg-white/82 text-ink"
    >
      <Avatar
        src={profile.avatarUrl}
        name={profile.name}
        initials={initialsFor(profile.name || "TABLE")}
        className="size-full text-sm"
      />
    </Link>
  );
}

function sanitizeProfile(profile: ProfilePreview): ProfilePreview {
  if (profile.avatarUrl?.startsWith("data:image")) {
    return { name: profile.name };
  }

  return profile;
}
