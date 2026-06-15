import type { Metadata } from "next";
import { EntryForm } from "@/components/upload/EntryForm";

export const metadata: Metadata = {
  title: "Add Memory"
};

export default function AddEntryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 pt-1 sm:px-6">
      <header className="space-y-3 pt-2">
        <p className="text-xs font-semibold uppercase text-muted">NEW</p>
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Add it while it is warm
        </h1>
      </header>
      <EntryForm />
    </div>
  );
}
