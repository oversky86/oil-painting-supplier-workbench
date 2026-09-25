import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { postSupplierApi } from "@/lib/pet-api";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const tab = request.nextUrl.searchParams.get("tab") || "action";
  const res = await postSupplierApi({
    action: "list_orders",
    tab,
  });
  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}
