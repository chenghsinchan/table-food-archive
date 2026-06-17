import type { Metadata } from "next";
import { RecipesExperience } from "@/components/recipes/RecipesExperience";

export const metadata: Metadata = {
  title: "Recipes"
};

export default function RecipesPage() {
  return <RecipesExperience />;
}
