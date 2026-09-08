import { findListings } from "./agent";
import { sendAlert } from "./email";
import { getSupabase } from "./supabase";
import type { SearchRule } from "./types";
import { normalizeListingUrl, sourceFromUrl } from "./urls";

export async function runSearch(rule: SearchRule) {
  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({ search_id: rule.id, status: "running" })
    .select()
    .single();
  if (runError) throw new Error(runError.message);

  try {
    const normalized = (await findListings(rule)).flatMap((listing) => {
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
      run_id: run.id,
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

    await supabase.from("runs").update({
      status: "complete",
      found_count: found.length,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);

    return { search: rule.name, found: found.length, newMatches: alertable.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run error";
    await supabase.from("runs").update({
      status: "failed",
      error: message.slice(0, 1000),
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);
    throw error;
  }
}

export async function runAllSearches() {
  const { data, error } = await getSupabase().from("searches").select("*").eq("active", true);
  if (error) throw new Error(error.message);

  // ponytail: parallel runs fit Vercel's 60s Hobby ceiling; add a job queue if rules become numerous.
  return Promise.all(((data || []) as SearchRule[]).map(runSearch));
}
