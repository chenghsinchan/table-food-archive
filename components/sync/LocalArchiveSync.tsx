"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveEntryToSupabase } from "@/lib/supabase/save-entry";
import { clearLocalEntries, readLocalEntries } from "@/lib/utils/local-entry-storage";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LocalArchiveSync() {
  useEffect(() => {
    let active = true;

    async function syncLocalArchive() {
      const localEntries = readLocalEntries();

      if (!localEntries.length) {
        return;
      }

      const supabase = createClient();

      if (!supabase) {
        return;
      }

      try {
        const { data: existingRows } = await supabase
          .from("food_entries")
          .select("title,entry_date,type")
          .eq("is_archived", false);
        const existingKeys = new Set(
          (existingRows ?? []).map((row) => archiveKey(row.title, row.entry_date, row.type))
        );

        for (const entry of localEntries) {
          if (!active) {
            return;
          }

          const key = archiveKey(entry.title, entry.entryDate, entry.type);

          if (existingKeys.has(key)) {
            continue;
          }

          const entryId = uuidPattern.test(entry.id) ? entry.id : await deterministicUuid(entry.id);

          await saveEntryToSupabase(supabase, {
            ...entry,
            id: entryId
          });
          existingKeys.add(key);
        }

        clearLocalEntries();
      } catch (error) {
        console.warn("Could not sync local TABLE entries to Supabase.", error);
      }
    }

    syncLocalArchive();

    return () => {
      active = false;
    };
  }, []);

  return null;
}

function archiveKey(title: string, entryDate: string, type: string) {
  return `${title.trim().toLowerCase()}|${entryDate}|${type}`;
}

async function deterministicUuid(input: string) {
  const bytes = new TextEncoder().encode(`table-local-entry:${input}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

  digest[6] = (digest[6] & 0x0f) | 0x40;
  digest[8] = (digest[8] & 0x3f) | 0x80;

  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
