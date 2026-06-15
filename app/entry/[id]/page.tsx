import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryExperience } from "@/components/entry/EntryExperience";
import { seedEntries } from "@/lib/seed-data";
import { getFoodEntryById } from "@/lib/supabase/entries";

type EntryPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return seedEntries.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = seedEntries.find((candidate) => candidate.id === id);

  return {
    title: entry?.title ?? "Entry"
  };
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { id } = await params;
  const entry = await getFoodEntryById(id);

  if (!entry) {
    notFound();
  }

  return <EntryExperience entry={entry} />;
}
