import type { Metadata } from "next";
import { RecipesExperience } from "@/components/recipes/RecipesExperience";

export const metadata: Metadata = {
  title: "Love"
};

export default function LovePage() {
  return <RecipesExperience />;
}
