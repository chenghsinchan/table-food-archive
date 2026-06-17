import { NextResponse } from "next/server";
import { commonTags, uniqueTagNames } from "@/lib/tags";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(commonTags, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  const { data } = await supabase.from("tags").select("name").order("name", { ascending: true });
  const names = uniqueTagNames([...(data ?? []).map((tag) => tag.name), ...commonTags]);

  return NextResponse.json(names, {
    headers: { "Cache-Control": "no-store" }
  });
}
