"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import { AvatarUploader } from "@/components/upload/AvatarUploader";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/supabase/storage";

type ProfileSetupProps = {
  user: User;
  onComplete: () => void;
};

function googleAvatar(user: User) {
  return String(user.user_metadata?.avatar_url || user.user_metadata?.picture || "");
}

function googleName(user: User) {
  return String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "");
}

export function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState(googleName(user));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = displayName.trim();
    if (!name) {
      setError("Add a display name first.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      onComplete();
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = googleAvatar(user) || null;
      let avatarStoragePath: string | null = null;

      if (avatarFile) {
        const compressed = await compressImageFile(avatarFile, {
          maxWidth: 512,
          targetMaxBytes: 300 * 1024,
          mimeType: "image/jpeg"
        });
        const path = `profiles/${user.id}/avatar-${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("food-photos").upload(path, compressed, {
          cacheControl: "31536000",
          upsert: true
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from("food-photos").getPublicUrl(path);
        avatarUrl = data.publicUrl;
        avatarStoragePath = path;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        display_name: name,
        avatar_url: avatarUrl,
        avatar_storage_path: avatarStoragePath,
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        throw profileError;
      }

      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={saveProfile} className="liquid-island w-full max-w-sm rounded-[28px] p-6">
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-accent">First time here</p>
            <h1 className="text-3xl font-semibold leading-tight text-ink">Make your profile</h1>
          </div>
          <AvatarUploader fallbackUrl={googleAvatar(user)} name={displayName} onFileChange={setAvatarFile} />
          <label className="grid gap-2 text-left">
            <span className="text-sm font-medium text-muted">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="min-h-12 rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
              placeholder="Cheng"
              autoComplete="name"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <Check aria-hidden="true" size={17} />
            {saving ? "Saving..." : "Enter TABLE"}
          </button>
          {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
        </div>
      </form>
    </div>
  );
}
