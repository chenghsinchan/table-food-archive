"use client";

import { useEffect, useMemo, useState } from "react";
import { commonTags, uniqueTagNames } from "@/lib/tags";

export function useSavedTags(extraTags: string[] = []) {
  const extraTagKey = extraTags.join("|");
  const stableExtraTags = useMemo(() => uniqueTagNames(extraTagKey ? extraTagKey.split("|") : []), [extraTagKey]);
  const [savedTags, setSavedTags] = useState(() => uniqueTagNames([...commonTags, ...stableExtraTags]));

  useEffect(() => {
    let active = true;

    async function loadTags() {
      try {
        const response = await fetch("/api/tags", {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (!response.ok) {
          return;
        }

        const tags = (await response.json()) as string[];

        if (active) {
          setSavedTags(uniqueTagNames([...tags, ...stableExtraTags]));
        }
      } catch {
        if (active) {
          setSavedTags(uniqueTagNames([...commonTags, ...stableExtraTags]));
        }
      }
    }

    loadTags();

    return () => {
      active = false;
    };
  }, [stableExtraTags]);

  return savedTags;
}
