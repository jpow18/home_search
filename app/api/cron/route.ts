import { NextResponse } from "next/server";
import { runAllSearches } from "@/lib/runner";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, results: await runAllSearches() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cron run failed." }, { status: 500 });
  }
}
