import { NextResponse } from "next/server";
import { getFoodEntries } from "@/lib/supabase/entries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const entries = await getFoodEntries();

  return NextResponse.json(entries, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
