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
        for (const entry of localEntries) {
          if (!active) {
            return;
          }

          await saveEntryToSupabase(supabase, {
            ...entry,
            id: uuidPattern.test(entry.id) ? entry.id : crypto.randomUUID()
          });
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
