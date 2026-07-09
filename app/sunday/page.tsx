import type { Metadata } from "next";
import { SundayExperience } from "@/components/sunday/SundayExperience";

export const metadata: Metadata = {
  title: "Sunday"
};

export default function SundayPage() {
  return <SundayExperience />;
}
