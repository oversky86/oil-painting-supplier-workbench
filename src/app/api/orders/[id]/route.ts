import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { postSupplierApi } from "@/lib/pet-api";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const res = await postSupplierApi({
    action: "order_detail",
    orderId: decodeURIComponent(id),
  });
  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "create_upload_url") {
    const res = await postSupplierApi({
      action: "create_upload_url",
      orderId: decodeURIComponent(id),
      kind: body.kind,
      contentType: body.contentType,
    });
    const json = await res.json().catch(() => ({ ok: false }));
    return NextResponse.json(json, { status: res.status });
  }

  if (action === "confirm_upload") {
    const res = await postSupplierApi({
      action: "confirm_upload",
      orderId: decodeURIComponent(id),
      imagePath: body.imagePath,
      videoPath: body.videoPath || null,
    });
    const json = await res.json().catch(() => ({ ok: false }));
    return NextResponse.json(json, { status: res.status });
  }

  if (action === "ship") {
    const res = await postSupplierApi({
      action: "ship",
      orderId: decodeURIComponent(id),
      trackingCompany: body.trackingCompany,
      trackingNumber: body.trackingNumber,
    });
    const json = await res.json().catch(() => ({ ok: false }));
    return NextResponse.json(json, { status: res.status });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
