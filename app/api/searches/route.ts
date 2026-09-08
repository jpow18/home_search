import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const optionalNumber = (value: unknown) => value === "" || value == null ? null : Number(value);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const location = String(body.location || "").trim();
    const propertyType = ["home", "land", "either"].includes(body.property_type) ? body.property_type : "either";
    const alertEmail = String(body.alert_email || "").trim();

    if (!name || !location) return NextResponse.json({ error: "Name and location are required." }, { status: 422 });
    if (alertEmail && !/^\S+@\S+\.\S+$/.test(alertEmail)) return NextResponse.json({ error: "Enter a valid alert email." }, { status: 422 });

    const row = {
      name,
      location,
      property_type: propertyType,
      min_price: optionalNumber(body.min_price),
      max_price: optionalNumber(body.max_price),
      min_beds: optionalNumber(body.min_beds),
      min_acres: optionalNumber(body.min_acres),
      must_haves: String(body.must_haves || "").trim(),
      deal_breakers: String(body.deal_breakers || "").trim(),
      alert_email: alertEmail,
    };

    const numbers = [row.min_price, row.max_price, row.min_beds, row.min_acres].filter((value) => value != null);
    if (numbers.some((value) => !Number.isFinite(value) || value! < 0)) {
      return NextResponse.json({ error: "Numeric filters must be zero or greater." }, { status: 422 });
    }
    if (row.min_price != null && row.max_price != null && row.min_price > row.max_price) {
      return NextResponse.json({ error: "Minimum price cannot exceed maximum price." }, { status: 422 });
    }

    const { data, error } = await getSupabase().from("searches").insert(row).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create search." }, { status: 500 });
  }
}
