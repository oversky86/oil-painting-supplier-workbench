"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  statusLabel,
  type ModificationNote,
  type SupplierOrderDetail,
} from "@/lib/types";

function attr(
  attrs: Array<{ key: string; value?: string | null }> | null | undefined,
  key: string,
) {
  const hidden = `_${key}`;
  return (
    attrs?.find((a) => a.key === hidden)?.value ||
    attrs?.find((a) => a.key === key)?.value ||
    ""
  );
}

function NoteOverlay({
  notes,
  imageUrl,
}: {
  notes: ModificationNote[];
  imageUrl?: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-[#dccfbc] bg-[#efe8dd]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Portrait with annotations" className="block w-full" />
      ) : (
        <div className="flex h-72 items-center justify-center text-sm text-[#6c6054]">
          No image
        </div>
      )}
      {notes.map((note, index) => (
        <span
          key={note.id}
          className="pointer-events-none absolute border-2 border-[#d6534c] bg-[#d6534c]/15"
          style={{
            left: `${note.selection.x}%`,
            top: `${note.selection.y}%`,
            width: `${note.selection.width}%`,
            height: `${note.selection.height}%`,
          }}
        >
          <span className="absolute right-[-11px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-[#d6534c] text-[11px] font-bold text-white">
            {note.index || index + 1}
          </span>
        </span>
      ))}
    </div>
  );
}

async function uploadToSignedUrl(file: File, uploadUrl: string, token: string) {
  // Supabase signed upload URL already includes the token query string.
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}). Token present: ${Boolean(token)}`);
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = decodeURIComponent(params.id);
  const [order, setOrder] = useState<SupplierOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progress, setProgress] = useState("");
  const [trackingCompany, setTrackingCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setOrder(json.order);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestRequest = useMemo(() => {
    if (!order?.modificationRequests?.length) return null;
    return order.modificationRequests[order.modificationRequests.length - 1];
  }, [order]);

  const annotatedImage = useMemo(() => {
    if (!order || !latestRequest) return order?.versions?.[order.versions.length - 1]?.imageUrl;
    const version = order.versions.find(
      (v) => v.versionNumber === latestRequest.againstVersion,
    );
    return version?.imageUrl || order.versions[order.versions.length - 1]?.imageUrl;
  }, [order, latestRequest]);

  const line = order?.lineItems?.[0];
  const attrs = line?.customAttributes || [];

  async function createUploadUrl(kind: "image" | "video", file: File) {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_upload_url",
        kind,
        contentType: file.type || (kind === "image" ? "image/jpeg" : "video/mp4"),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Could not create upload URL");
    }
    return json as { path: string; uploadUrl: string; token: string };
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!imageFile) {
      setError("Portrait image is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setProgress("Preparing image upload…");
      const imageSigned = await createUploadUrl("image", imageFile);
      setProgress("Uploading image…");
      await uploadToSignedUrl(imageFile, imageSigned.uploadUrl, imageSigned.token);

      let videoPath: string | null = null;
      if (videoFile) {
        setProgress("Preparing video upload…");
        const videoSigned = await createUploadUrl("video", videoFile);
        setProgress("Uploading video…");
        await uploadToSignedUrl(videoFile, videoSigned.uploadUrl, videoSigned.token);
        videoPath = videoSigned.path;
      }

      setProgress("Confirming delivery…");
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_upload",
          imagePath: imageSigned.path,
          videoPath,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Confirm failed");
      setImageFile(null);
      setVideoFile(null);
      setProgress("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  async function onShip(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ship",
          trackingCompany,
          trackingNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Ship failed");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ship failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-sm text-[#6c6054]">Loading order…</p>;
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[#a33b35]">{error || "Order not found"}</p>
        <Link href="/orders" className="mt-4 inline-block text-sm underline">
          Back to orders
        </Link>
      </main>
    );
  }

  const canUpload =
    order.businessStatus === "order_placed" ||
    order.businessStatus === "supplier_modification";
  const canShip = order.businessStatus === "prepare_shipment";
  const nextVersion = (order.versionCount || 0) + 1;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <Link href="/orders?tab=action" className="text-sm text-[#6c6054] hover:text-[#241c16]">
        ← Back to orders
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-[#241c16]">{order.name}</h1>
        <span className="rounded-full border border-[#dccfbc] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold text-[#5f564b]">
          {statusLabel(order.businessStatus)}
        </span>
      </header>
      <p className="mt-2 text-sm text-[#6c6054]">
        {order.email || "No email"} · {new Date(order.createdAt).toLocaleString()}
      </p>

      {error ? (
        <p className="mt-4 rounded-[8px] border border-[#f0c2be] bg-[#fff5f4] px-4 py-3 text-sm text-[#a33b35]">
          {error}
        </p>
      ) : null}

      <section className="mt-6 rounded-[12px] border border-[#31271f] bg-[#31271f] p-5 text-white md:p-6">
        <h2 className="text-xl font-semibold">What to do next</h2>
        {canUpload ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {order.businessStatus === "supplier_modification" && latestRequest ? (
              <div>
                <p className="text-sm text-white/80">
                  Latest customer notes against version {latestRequest.againstVersion}. Upload
                  version {nextVersion} of {3}.
                </p>
                <div className="mt-4">
                  <NoteOverlay notes={latestRequest.notes} imageUrl={annotatedImage} />
                </div>
                <ol className="mt-4 grid gap-2 text-sm text-white/90">
                  {latestRequest.notes.map((note, index) => (
                    <li key={note.id} className="rounded-[8px] bg-white/10 px-3 py-2">
                      <strong>#{note.index || index + 1}</strong> {note.text}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/80">
                  Upload the finished portrait image and studio video for version {nextVersion}.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {order.originalPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.originalPhotoUrl}
                      alt="Customer original"
                      className="h-48 w-full rounded-[8px] object-cover"
                    />
                  ) : null}
                  {order.paintingUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.paintingUrl}
                      alt="AI reference"
                      className="h-48 w-full rounded-[8px] object-cover"
                    />
                  ) : null}
                </div>
              </div>
            )}

            <form onSubmit={onUpload} className="rounded-[10px] bg-white p-4 text-[#241c16]">
              <h3 className="text-lg font-semibold">
                {order.businessStatus === "supplier_modification"
                  ? `Upload revision (version ${nextVersion})`
                  : `Upload finished artwork (version ${nextVersion})`}
              </h3>
              <label className="mt-4 block text-sm font-medium">
                Portrait image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  required
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Studio video (optional but recommended)
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="mt-2 block w-full text-sm"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              </label>
              {progress ? <p className="mt-3 text-sm text-[#6c6054]">{progress}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white"
              >
                {busy ? "Uploading…" : "Submit to customer review"}
              </button>
            </form>
          </div>
        ) : null}

        {canShip ? (
          <form onSubmit={onShip} className="mt-4 max-w-md rounded-[10px] bg-white p-4 text-[#241c16]">
            <p className="text-sm text-[#6c6054]">
              Customer approved the portrait. Enter carrier details to fulfill the Shopify order and
              mark it shipped.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Carrier
              <input
                className="mt-2 w-full rounded-[8px] border border-[#dccfbc] px-3 py-3"
                value={trackingCompany}
                onChange={(e) => setTrackingCompany(e.target.value)}
                placeholder="UPS / FedEx / DHL"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Tracking number
              <input
                className="mt-2 w-full rounded-[8px] border border-[#dccfbc] px-3 py-3"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white"
            >
              {busy ? "Submitting…" : "Mark as shipped"}
            </button>
          </form>
        ) : null}

        {order.businessStatus === "portrait_review" ? (
          <p className="mt-3 text-sm text-white/85">
            Version {order.versionCount} is with the customer. No supplier action until they approve
            or request modifications.
          </p>
        ) : null}

        {order.businessStatus === "shipped" ? (
          <p className="mt-3 text-sm text-white/85">
            Shipped via {order.trackingCompany || "carrier"} · {order.trackingNumber || "—"}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[12px] border border-[#dccfbc] bg-white p-5">
          <h2 className="text-lg font-semibold">Order details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6c6054]">Style</dt>
              <dd className="font-medium">
                {order.paintingStyle || attr(attrs, "style") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">Size</dt>
              <dd className="font-medium">{attr(attrs, "size") || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">Finish</dt>
              <dd className="font-medium">{attr(attrs, "finish") || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">Pets</dt>
              <dd className="font-medium">{attr(attrs, "pet_quantity") || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">Total</dt>
              <dd className="font-medium">
                {order.total
                  ? `${order.total.currencyCode} ${order.total.amount}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">Gift message</dt>
              <dd className="font-medium">{order.giftMessage || "—"}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {order.originalPhotoUrl ? (
              <div>
                <p className="mb-2 text-sm text-[#6c6054]">Customer original</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.originalPhotoUrl}
                  alt="Original photo"
                  className="h-48 w-full rounded-[8px] object-cover"
                />
              </div>
            ) : null}
            {order.paintingUrl ? (
              <div>
                <p className="mb-2 text-sm text-[#6c6054]">AI reference</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.paintingUrl}
                  alt="AI painting"
                  className="h-48 w-full rounded-[8px] object-cover"
                />
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-[12px] border border-[#dccfbc] bg-white p-5">
          <h2 className="text-lg font-semibold">Shipping</h2>
          {order.shippingAddress ? (
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[#6c6054]">Name</dt>
                <dd className="font-medium">
                  {order.shippingAddress.name ||
                    [order.shippingAddress.firstName, order.shippingAddress.lastName]
                      .filter(Boolean)
                      .join(" ")}
                </dd>
              </div>
              <div>
                <dt className="text-[#6c6054]">Phone</dt>
                <dd className="font-medium">{order.shippingAddress.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6c6054]">Address</dt>
                <dd className="font-medium whitespace-pre-line">
                  {[
                    order.shippingAddress.address1,
                    order.shippingAddress.address2,
                    [order.shippingAddress.city, order.shippingAddress.province]
                      .filter(Boolean)
                      .join(", "),
                    order.shippingAddress.zip,
                    order.shippingAddress.country,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[#6c6054]">No shipping address on file.</p>
          )}
        </article>
      </section>

      <section className="mt-6 rounded-[12px] border border-[#dccfbc] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Version history</h2>
          <button
            type="button"
            className="text-sm font-medium text-[#31271f] underline"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? "Hide" : "Show"}
          </button>
        </div>
        {historyOpen ? (
          <ul className="mt-4 grid gap-3">
            {order.versions.length === 0 ? (
              <li className="text-sm text-[#6c6054]">No studio versions yet.</li>
            ) : (
              order.versions
                .slice()
                .reverse()
                .map((version) => {
                  const req = order.modificationRequests.find(
                    (r) => r.againstVersion === version.versionNumber,
                  );
                  return (
                    <li
                      key={version.versionNumber}
                      className="rounded-[8px] border border-[#e7dccc] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>Version {version.versionNumber}</strong>
                        <span className="text-xs text-[#6c6054]">
                          {version.createdAt
                            ? new Date(version.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#6c6054]">
                        {req
                          ? `${req.notes.length} modification notes after this version`
                          : "No modification notes"}
                      </p>
                      {version.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={version.imageUrl}
                          alt={`Version ${version.versionNumber}`}
                          className="mt-3 h-40 rounded-[8px] object-cover"
                        />
                      ) : null}
                    </li>
                  );
                })
            )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#6c6054]">
            {order.versions.length} version(s) · {order.modificationCount} modification
            request(s). Expand to review earlier rounds.
          </p>
        )}
      </section>
    </main>
  );
}
