"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
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
        setProfile(JSON.parse(localProfile) as ProfilePreview);
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
      className="tap-scale liquid-glass grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/72 text-ink shadow-sm"
    >
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
      ) : profile.name ? (
        <span className="text-sm font-semibold">{initialsFor(profile.name)}</span>
      ) : (
        <UserRound aria-hidden="true" size={20} strokeWidth={1.8} />
      )}
    </Link>
  );
}
