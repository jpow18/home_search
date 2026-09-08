import { retrieveListingSearch, startListingSearch, type AgentListing } from "./agent";
import { sendAlert } from "./email";
import { matchesHardFilters } from "./searches";
import { getSupabase } from "./supabase";
import type { Run, SearchRule } from "./types";
import { normalizeListingUrl, sourceFromUrl } from "./urls";

export type RunResult = {
  id: string;
  search: string;
  status: Run["status"];
  found: number;
  newMatches: number;
  error?: string;
};

async function failRun(id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Unknown run error");
  await getSupabase().from("runs").update({
    status: "failed",
    error: message.slice(0, 1000),
    finished_at: new Date().toISOString(),
  }).eq("id", id);
  return message;
}

export async function startSearch(rule: SearchRule): Promise<RunResult> {
  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({ search_id: rule.id, status: "running" })
    .select()
    .single();
  if (runError) throw new Error(runError.message);

  try {
    const search = await startListingSearch(rule);
    const { error } = await supabase.from("runs").update({ openai_response_id: search.id }).eq("id", run.id);
    if (error) throw new Error(error.message);
    return { id: run.id, search: rule.name, status: "running", found: 0, newMatches: 0 };
  } catch (error) {
    await failRun(run.id, error);
    throw error;
  }
}

async function finishRun(rule: SearchRule, runId: string, listings: AgentListing[]): Promise<RunResult> {
  const supabase = getSupabase();
  const normalized = listings.filter((listing) => matchesHardFilters(listing, rule)).flatMap((listing) => {
    try {
      return [{ ...listing, url: normalizeListingUrl(listing.url) }];
    } catch {
      return [];
    }
  });
  const found = [...new Map(normalized.map((listing) => [listing.url, listing])).values()];
  const urls = found.map((listing) => listing.url);
  const { data: known, error: knownError } = urls.length
    ? await supabase.from("listings").select("url, alerted_at").eq("search_id", rule.id).in("url", urls)
    : { data: [], error: null };
  if (knownError) throw new Error(knownError.message);

  const alertedUrls = new Set((known || []).filter(({ alerted_at }) => alerted_at).map(({ url }) => url));
  const rows = found.map((listing) => ({
    ...listing,
    search_id: rule.id,
    run_id: runId,
    source: sourceFromUrl(listing.url),
    last_seen_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await supabase.from("listings").upsert(rows, { onConflict: "search_id,url" });
    if (error) throw new Error(error.message);
  }

  const alertable = found.filter((listing) => !alertedUrls.has(listing.url) && listing.score >= 75);
  if (await sendAlert(rule, alertable)) {
    const { error } = await supabase.from("listings").update({ alerted_at: new Date().toISOString() }).eq("search_id", rule.id).in("url", alertable.map(({ url }) => url));
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("runs").update({
    status: "complete",
    found_count: found.length,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);
  if (error) throw new Error(error.message);

  return { id: runId, search: rule.name, status: "complete", found: found.length, newMatches: alertable.length };
}

export async function checkRun(id: string): Promise<RunResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("runs").select("*, search:searches(*)").eq("id", id).single();
  if (error || !data) throw new Error(error?.message || "Search run not found.");
  const run = data as Run & { search: SearchRule };
  const base = { id: run.id, search: run.search.name, found: run.found_count, newMatches: 0 };
  if (run.status !== "running") return { ...base, status: run.status, ...(run.error ? { error: run.error } : {}) };

  try {
    if (!run.openai_response_id) throw new Error("The search stopped before its background job started.");
    const result = await retrieveListingSearch(run.openai_response_id);
    if (result.status === "queued" || result.status === "in_progress") return { ...base, status: "running" };
    if (result.status !== "completed") throw new Error(result.error || `OpenAI search ended with status: ${result.status}.`);
    return finishRun(run.search, run.id, result.listings || []);
  } catch (error) {
    return { ...base, status: "failed", error: await failRun(run.id, error) };
  }
}

export async function startAllSearches() {
  const { data, error } = await getSupabase().from("searches").select("*").eq("active", true);
  if (error) throw new Error(error.message);
  return Promise.all(((data || []) as SearchRule[]).map(startSearch));
}
