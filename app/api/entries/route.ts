import { NextResponse } from "next/server";
import { getFoodEntries } from "@/lib/supabase/entries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("group") || undefined;
  const entries = await getFoodEntries(groupId);

  return NextResponse.json(entries, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
