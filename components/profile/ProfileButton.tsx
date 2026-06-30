"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type ProfilePreview = {
  name: string;
  avatarUrl?: string;
};

// Module-level cache: survives client-side navigation so the avatar shows
// instantly and identically on every page (no reload flash after first load).
let cachedProfile: ProfilePreview | null = null;

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
  // Seed from the in-memory cache so navigating between pages never flashes.
  const [profile, setProfile] = useState<ProfilePreview>(() => cachedProfile ?? { name: "TABLE" });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      // First load of the session: seed from localStorage before the network call.
      if (!cachedProfile) {
        const localProfile = window.localStorage.getItem("table-profile");
        if (localProfile) {
          const parsedProfile = sanitizeProfile(JSON.parse(localProfile) as ProfilePreview);
          cachedProfile = parsedProfile;
          if (active) setProfile(parsedProfile);
        }
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

      const nextProfile: ProfilePreview = {
        name: data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "TABLE",
        avatarUrl: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
      };

      cachedProfile = nextProfile;
      window.localStorage.setItem("table-profile", JSON.stringify(sanitizeProfile(nextProfile)));
      setProfile(nextProfile);
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
