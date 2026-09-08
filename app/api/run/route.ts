import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { checkRun, startAllSearches, startSearch } from "@/lib/runner";
import type { SearchRule } from "@/lib/types";

export const maxDuration = 60;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { searchId } = await request.json().catch(() => ({}));
    if (!searchId) return NextResponse.json({ runs: await startAllSearches() }, { status: 202 });
    if (typeof searchId !== "string" || !uuid.test(searchId)) return NextResponse.json({ error: "Invalid search ID." }, { status: 400 });

    const { data, error } = await getSupabase().from("searches").select("*").eq("id", searchId).single();
    if (error || !data) return NextResponse.json({ error: "Search not found." }, { status: 404 });
    return NextResponse.json({ runs: [await startSearch(data as SearchRule)] }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search run failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.getAll("id");
  if (!ids.length || ids.length > 20 || ids.some((id) => !uuid.test(id))) {
    return NextResponse.json({ error: "One to twenty valid run IDs are required." }, { status: 400 });
  }

  try {
    const runs = await Promise.all(ids.map(checkRun));
    const status = runs.some((run) => run.status === "failed")
      ? "failed"
      : runs.every((run) => run.status === "complete") ? "complete" : "running";
    return NextResponse.json({ status, runs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check the search." }, { status: 500 });
  }
}
