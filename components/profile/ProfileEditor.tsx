"use client";

import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploader } from "@/components/upload/AvatarUploader";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/supabase/storage";

type ProfileState = {
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

export function ProfileEditor() {
  const [profile, setProfile] = useState<ProfileState>({ name: "TABLE" });
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const localProfile = window.localStorage.getItem("table-profile");
      if (localProfile) {
        const parsedProfile = sanitizeProfile(JSON.parse(localProfile) as ProfileState);
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

      setUserId(user.id);
      setEmail(user.email ?? "");

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

  function startEditing() {
    setDraftName(profile.name);
    setAvatarFile(null);
    setError("");
    setSaved(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setAvatarFile(null);
    setError("");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);

    const name = draftName.trim();
    if (!name) {
      setError("Add a display name first.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      let avatarUrl = profile.avatarUrl;
      let avatarStoragePath: string | null = null;

      if (avatarFile) {
        if (!supabase) {
          throw new Error("Photo upload is not connected. Supabase Storage is required for profile images.");
        }

        const profileId = userId ?? getLocalProfileId();
        const compressed = await compressImageFile(avatarFile, {
          maxWidth: 512,
          targetMaxBytes: 300 * 1024,
          mimeType: "image/jpeg"
        });
        const path = `profiles/${profileId}/avatar-${crypto.randomUUID()}.jpg`;
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

      if (supabase && userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email,
          display_name: name,
          avatar_url: avatarUrl || null,
          avatar_storage_path: avatarStoragePath,
          updated_at: new Date().toISOString()
        });

        if (profileError) {
          throw profileError;
        }
      }

      const nextProfile = sanitizeProfile({ name, avatarUrl });
      window.localStorage.setItem("table-profile", JSON.stringify(nextProfile));
      setProfile(nextProfile);
      setSaved(true);
      setIsEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  // ---- Read-only view ----
  if (!isEditing) {
    return (
      <section className="liquid-island rounded-[28px] p-6">
        <div className="space-y-5 text-center">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            initials={initialsFor(profile.name)}
            className="mx-auto size-24 border border-border text-2xl"
          />
          <div className="space-y-1">
            <h2 className="font-serif text-3xl italic leading-tight text-ink">{profile.name}</h2>
            {email ? (
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{email}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="tap-scale inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-surface-warm px-6 text-sm font-semibold text-ink"
          >
            <Pencil aria-hidden="true" size={16} />
            Edit profile
          </button>
          {saved ? <p className="text-sm font-medium text-muted">Profile updated.</p> : null}
        </div>
      </section>
    );
  }

  // ---- Edit view ----
  return (
    <form onSubmit={saveProfile} className="space-y-6">
      <section className="liquid-island rounded-[28px] p-6">
        <div className="space-y-5 text-center">
          <AvatarUploader fallbackUrl={profile.avatarUrl} name={draftName} onFileChange={setAvatarFile} />
          <label className="grid gap-2 text-left">
            <span className="text-sm font-medium text-muted">Display name</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="min-h-12 rounded-lg border border-border bg-white px-4 text-base outline-none transition focus:border-accent"
              placeholder="Cheng"
              autoComplete="name"
            />
          </label>
          {email ? (
            <p className="text-left font-mono text-xs uppercase tracking-[0.16em] text-muted">
              Signed in as {email}
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="tap-scale flex min-h-14 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          <Check aria-hidden="true" size={18} />
          {saving ? "Saving..." : "Save profile"}
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={saving}
          className="tap-scale min-h-14 rounded-pill bg-surface-warm px-6 text-base font-semibold text-ink disabled:opacity-70"
        >
          Cancel
        </button>
      </div>

      {error ? <p className="text-center text-sm leading-6 text-accent">{error}</p> : null}
    </form>
  );
}

function getLocalProfileId() {
  const storedId = window.localStorage.getItem("table-profile-id");

  if (storedId) {
    return storedId;
  }

  const nextId = `local-${crypto.randomUUID()}`;
  window.localStorage.setItem("table-profile-id", nextId);
  return nextId;
}

function sanitizeProfile(profile: ProfileState): ProfileState {
  if (profile.avatarUrl?.startsWith("data:image")) {
    return { name: profile.name };
  }

  return profile;
}
