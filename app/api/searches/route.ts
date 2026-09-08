import { NextResponse } from "next/server";
import { searchAttributes } from "@/lib/searches";
import { getSupabase } from "@/lib/supabase";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const parsed = searchAttributes(await request.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 422 });

    const { data, error } = await getSupabase().from("searches").insert(parsed.data).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create search." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || typeof body.id !== "string" || !uuid.test(body.id)) {
      return NextResponse.json({ error: "Invalid search ID." }, { status: 400 });
    }

    let changes;
    if (typeof body.active === "boolean" && !("name" in body)) {
      changes = { active: body.active };
    } else {
      const parsed = searchAttributes(body);
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 422 });
      changes = parsed.data;
    }

    const { data, error } = await getSupabase().from("searches").update(changes).eq("id", body.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Search not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update search." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || typeof body.id !== "string" || !uuid.test(body.id)) {
      return NextResponse.json({ error: "Invalid search ID." }, { status: 400 });
    }

    const { data, error } = await getSupabase().from("searches").delete().eq("id", body.id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Search not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete search." }, { status: 500 });
  }
}
