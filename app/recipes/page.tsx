import type { Metadata } from "next";
import { RecipesExperience } from "@/components/recipes/RecipesExperience";
import { getFoodEntries } from "@/lib/supabase/entries";

export const metadata: Metadata = {
  title: "Recipes"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecipesPage() {
  const entries = await getFoodEntries();

  return <RecipesExperience entries={entries} />;
}
