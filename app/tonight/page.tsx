import type { Metadata } from "next";
import { TonightExperience } from "@/app/tonight/TonightExperience";

export const metadata: Metadata = {
  title: "Tonight"
};

export default function TonightPage() {
  return <TonightExperience />;
}
