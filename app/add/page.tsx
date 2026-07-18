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
    <div className="mx-auto w-full max-w-md px-3 pb-10 pt-1 sm:px-6">
      <Suspense>
        <EntryForm entries={entries} />
      </Suspense>
    </div>
  );
}
