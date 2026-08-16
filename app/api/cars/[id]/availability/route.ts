import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { bangkokDateStr } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fromStr = bangkokDateStr(new Date());
  const map = await getAvailability([id], fromStr, 90);

  return NextResponse.json({ availability: map.get(id) ?? {} });
}
