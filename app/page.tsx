import { HomeExperience } from "@/components/home/HomeExperience";
import { getFoodEntries } from "@/lib/supabase/entries";

export default async function HomePage() {
  const entries = await getFoodEntries();

  return <HomeExperience entries={entries} />;
}
