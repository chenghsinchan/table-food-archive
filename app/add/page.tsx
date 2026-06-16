import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryForm } from "@/components/upload/EntryForm";
import { getFoodEntries } from "@/lib/supabase/entries";

export const metadata: Metadata = {
  title: "Add Memory"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AddEntryPage() {
  const entries = await getFoodEntries();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="space-y-3 pt-2">
        <p className="text-xs font-semibold uppercase text-muted">NEW</p>
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Add it while it is warm
        </h1>
      </header>
      <Suspense>
        <EntryForm entries={entries} />
      </Suspense>
    </div>
  );
}
