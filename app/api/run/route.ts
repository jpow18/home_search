import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { runAllSearches, runSearch } from "@/lib/runner";
import type { SearchRule } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { searchId } = await request.json().catch(() => ({}));
    if (!searchId) return NextResponse.json({ results: await runAllSearches() });

    const { data, error } = await getSupabase().from("searches").select("*").eq("id", searchId).single();
    if (error || !data) return NextResponse.json({ error: "Search not found." }, { status: 404 });
    return NextResponse.json({ results: [await runSearch(data as SearchRule)] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search run failed." }, { status: 500 });
  }
}
