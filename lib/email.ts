import { createHash } from "node:crypto";
import type { AgentListing } from "./agent";
import type { SearchRule } from "./types";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);

export async function sendAlert(rule: SearchRule, listings: AgentListing[]) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM_EMAIL || !rule.alert_email || listings.length === 0) return false;

  const cards = listings.map((listing) => `
    <div style="border-top:1px solid #d8d2c4;padding:20px 0">
      <p style="margin:0 0 4px;font-size:20px;font-weight:700">${escapeHtml(listing.title)}</p>
      <p style="margin:0 0 10px;color:#5b6258">${escapeHtml(listing.address)} · ${listing.score}% match</p>
      <p style="margin:0 0 12px">${escapeHtml(listing.summary)}</p>
      <a href="${escapeHtml(listing.url)}" style="color:#315f45;font-weight:700">View listing →</a>
    </div>`).join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `homeseek-${rule.id}-${createHash("sha256").update(listings.map(({ url }) => url).sort().join("|")).digest("hex").slice(0, 24)}`,
    },
    body: JSON.stringify({
      from: process.env.ALERT_FROM_EMAIL,
      to: [rule.alert_email],
      subject: `${listings.length} new match${listings.length === 1 ? "" : "es"} for ${rule.name}`,
      html: `<main style="font:16px/1.5 Georgia,serif;max-width:620px;margin:auto;color:#20251f"><h1 style="font-size:30px">Fresh ground.</h1><p>HomeSeek found new properties scoring 75% or better for <strong>${escapeHtml(rule.name)}</strong>.</p>${cards}<p style="color:#71776e;font-size:13px">Verify all listing details with the source before you act.</p></main>`,
    }),
  });

  if (!response.ok) throw new Error(`Resend failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return true;
}
