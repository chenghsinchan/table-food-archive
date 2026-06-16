import { HomeExperience } from "@/components/home/HomeExperience";
import { getFoodEntries } from "@/lib/supabase/entries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const entries = await getFoodEntries();

  return <HomeExperience entries={entries} />;
}
