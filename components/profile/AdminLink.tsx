"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { OWNER_EMAIL } from "@/lib/groups/constants";

/** A quiet link to the founder-only analytics dashboard. Renders nothing for anyone else. */
export function AdminLink() {
  const { t } = useLanguage();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkOwner() {
      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (active && (user?.email ?? "").toLowerCase() === OWNER_EMAIL) {
        setIsOwner(true);
      }
    }

    checkOwner();

    return () => {
      active = false;
    };
  }, []);

  if (!isOwner) {
    return null;
  }

  return (
    <Link
      href="/admin/analytics"
      className="tap-scale flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-warm px-5 text-sm font-semibold text-ink"
    >
      <BarChart3 aria-hidden="true" size={17} />
      {t("admin.analytics")}
    </Link>
  );
}
