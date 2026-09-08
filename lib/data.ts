import { demoData } from "./demo";
import { getSupabase, hasDatabase } from "./supabase";
import type { DashboardData, Listing, Run, SearchRule } from "./types";

export async function getDashboardData(): Promise<DashboardData> {
  const configured = {
    database: hasDatabase,
    agent: Boolean(process.env.OPENAI_API_KEY),
    email: Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL),
  };

  if (!hasDatabase) return { ...demoData, configured };

  const supabase = getSupabase();
  const [searchesResult, listingsResult, runsResult] = await Promise.all([
    supabase.from("searches").select("*").order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("*, search:searches(name, location)")
      .neq("status", "passed")
      .order("score", { ascending: false })
      .order("first_seen_at", { ascending: false })
      .limit(100),
    supabase.from("runs").select("*").order("started_at", { ascending: false }).limit(10),
  ]);

  const error = searchesResult.error || listingsResult.error || runsResult.error;
  if (error) throw new Error(error.message);

  return {
    searches: (searchesResult.data || []) as SearchRule[],
    listings: (listingsResult.data || []) as Listing[],
    recentRuns: (runsResult.data || []) as Run[],
    demo: false,
    configured,
  };
}
