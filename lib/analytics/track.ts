"use client";

import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventPropertiesMap } from "@/types/analytics";

type TrackableEventName = keyof AnalyticsEventPropertiesMap;

/**
 * Record a lightweight, privacy-first product event.
 *
 * Fire-and-forget by design: this never throws, never shows an error, and
 * never delays the caller. If Supabase isn't configured, no one is signed
 * in, or the insert fails for any reason, the event is silently dropped —
 * analytics must never interrupt the user experience.
 *
 * The signed-in user is attached automatically. `properties` is typed per
 * event name (see types/analytics.ts) and must only ever contain IDs or
 * small anonymous metadata — never titles, notes, ingredients, photos, or
 * locations.
 */
export function trackEvent<Name extends TrackableEventName>(
  eventName: Name,
  properties?: AnalyticsEventPropertiesMap[Name]
): void {
  void recordEvent(eventName, properties ?? {});
}

async function recordEvent(eventName: TrackableEventName, properties: Record<string, unknown>) {
  try {
    const supabase = createClient();

    if (!supabase) {
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: eventName,
      properties
    });
  } catch {
    // Analytics must never interrupt the user experience.
  }
}
