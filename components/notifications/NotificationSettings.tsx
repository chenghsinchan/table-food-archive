"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import {
  VAPID_PUBLIC_KEY,
  getCurrentSubscription,
  isIos,
  isPushSupported,
  isStandalone,
  subscribeThisDevice,
  unsubscribeThisDevice
} from "@/lib/push/client";

type UiState = "loading" | "enabled" | "disabled" | "unsupported" | "needs-install";

export function NotificationSettings() {
  const { t } = useLanguage();
  const [state, setState] = useState<UiState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function detect() {
      if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
        // On iPhone, push only works once the app is installed to the Home Screen.
        if (isIos() && !isStandalone()) {
          if (active) setState("needs-install");
          return;
        }
        if (active) setState("unsupported");
        return;
      }

      if (isIos() && !isStandalone()) {
        if (active) setState("needs-install");
        return;
      }

      const subscription = await getCurrentSubscription();
      if (!active) return;
      setState(subscription ? "enabled" : "disabled");
    }

    detect();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setError("");
    setBusy(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Notifications need Supabase to be connected.");
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Sign in again to enable notifications.");
      }

      const device = await subscribeThisDevice();

      const { error: saveError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: device.endpoint,
          p256dh: device.p256dh,
          auth: device.auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: "endpoint" }
      );

      if (saveError) {
        throw saveError;
      }

      setState("enabled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError("");
    setBusy(true);

    try {
      const endpoint = await unsubscribeThisDevice();
      const supabase = createClient();

      if (endpoint && supabase) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }

      setState("disabled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="liquid-island space-y-4 rounded-[28px] p-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{t("notif.eyebrow")}</p>
        <h2 className="font-serif text-2xl italic leading-tight text-ink">{t("notif.title")}</h2>
        <p className="text-sm leading-6 text-muted">{t("notif.sub")}</p>
      </div>

      {state === "loading" ? <p className="text-sm text-muted">{t("notif.checking")}</p> : null}

      {state === "needs-install" ? (
        <p className="rounded-lg bg-surface-warm px-4 py-3 text-sm leading-6 text-ink">{t("notif.needsInstall")}</p>
      ) : null}

      {state === "unsupported" ? (
        <p className="rounded-lg bg-surface-warm px-4 py-3 text-sm leading-6 text-muted">{t("notif.unsupported")}</p>
      ) : null}

      {state === "disabled" ? (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          <Bell aria-hidden="true" size={17} />
          {busy ? t("notif.enabling") : t("notif.enable")}
        </button>
      ) : null}

      {state === "enabled" ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Check aria-hidden="true" size={16} />
            {t("notif.enabled")}
          </p>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink disabled:cursor-wait disabled:opacity-70"
          >
            <BellOff aria-hidden="true" size={17} />
            {busy ? t("notif.disabling") : t("notif.disable")}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm leading-6 text-accent">{error}</p> : null}
    </section>
  );
}
