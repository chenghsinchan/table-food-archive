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
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="space-y-2 border-b border-border pb-5 pt-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">New entry</p>
        <h1 className="font-serif text-4xl italic leading-tight text-ink sm:text-5xl">
          Keep the moment.
        </h1>
      </header>
      <Suspense>
        <EntryForm entries={entries} />
      </Suspense>
    </div>
  );
}
