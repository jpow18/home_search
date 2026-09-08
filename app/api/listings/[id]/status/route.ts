import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { status } = await request.json();
    if (!["new", "saved", "passed"].includes(status)) return NextResponse.json({ error: "Invalid listing status." }, { status: 422 });

    const { error } = await getSupabase().from("listings").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update listing." }, { status: 500 });
  }
}
