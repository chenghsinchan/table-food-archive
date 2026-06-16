import type { Metadata } from "next";
import { TonightExperience } from "@/app/tonight/TonightExperience";
import { getFoodEntries } from "@/lib/supabase/entries";

export const metadata: Metadata = {
  title: "Tonight"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TonightPage() {
  const entries = await getFoodEntries();

  return <TonightExperience entries={entries} />;
}
