"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ErrorNotice } from "@/components/error-notice";
import {
  MAX_PORTRAIT_VERSIONS,
  statusLabel,
  type ModificationNote,
  type SupplierOrderDetail,
} from "@/lib/types";

type LineItem = SupplierOrderDetail["lineItems"][number];

/** Theme line-item properties (`buildLineProperties` in viewbrush-flow.js); hidden keys carry a `_` prefix. */
function attr(line: LineItem | undefined, key: string) {
  const attrs = line?.customAttributes || [];
  return (
    attrs.find((a) => a.key === `_${key}`)?.value ||
    attrs.find((a) => a.key === key)?.value ||
    ""
  );
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "";
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
        <img src={imageUrl} alt="带标注的画像" className="block w-full" />
      ) : (
        <div className="flex h-72 items-center justify-center text-sm text-[#6c6054]">
          没有图片
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

const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";
const VIDEO_ACCEPT =
  "video/mp4,video/quicktime,video/webm,video/x-m4v,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp";

const IMAGE_TYPE_BY_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/heic": "image/heic",
  "image/heif": "image/heif",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heif",
};
const VIDEO_TYPE_BY_MIME: Record<string, string> = {
  "video/mp4": "video/mp4",
  "video/mpeg": "video/mp4",
  "video/quicktime": "video/quicktime",
  "video/mov": "video/quicktime",
  "video/x-m4v": "video/x-m4v",
  "video/m4v": "video/x-m4v",
  "video/webm": "video/webm",
  "video/3gpp": "video/3gpp",
  "video/3gp": "video/3gpp",
  "video/3gpp2": "video/3gpp",
};
const IMAGE_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};
const VIDEO_TYPE_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

/** Browsers often omit a MIME type for HEIC/MOV; fall back to the file extension. */
function contentTypeForUpload(file: File, kind: "image" | "video"): string | null {
  const raw = (file.type || "").toLowerCase().split(";")[0].trim();
  const byMime = kind === "image" ? IMAGE_TYPE_BY_MIME : VIDEO_TYPE_BY_MIME;
  if (raw && byMime[raw]) return byMime[raw];
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const byExt = kind === "image" ? IMAGE_TYPE_BY_EXT : VIDEO_TYPE_BY_EXT;
  return byExt[ext] || null;
}

function NoteList({ notes, dark }: { notes: ModificationNote[]; dark?: boolean }) {
  return (
    <ol className={`grid gap-2 text-sm ${dark ? "text-white/90" : "text-[#31271f]"}`}>
      {notes.map((note, index) => (
        <li
          key={note.id}
          className={`rounded-[8px] px-3 py-2 ${dark ? "bg-white/10" : "bg-[#f7f0e6]"}`}
        >
          <strong>#{note.index || index + 1}</strong> {note.text}
        </li>
      ))}
    </ol>
  );
}

function SourceThumb({
  url,
  label,
  tone,
  onOpen,
}: {
  url?: string | null;
  label: string;
  tone: "light" | "dark";
  onOpen: (src: string, alt: string) => void;
}) {
  const frame = "h-28 w-28 overflow-hidden rounded-[8px]";
  const caption = tone === "dark" ? "text-white/70" : "text-[#6c6054]";
  return (
    <figure className="min-w-0">
      {url ? (
        <button
          type="button"
          className={`${frame} block border ${tone === "dark" ? "border-white/25" : "border-[#dccfbc]"}`}
          onClick={() => onOpen(url, label)}
          aria-label={`查看${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-full w-full object-cover" />
        </button>
      ) : (
        <div
          className={`${frame} flex items-center justify-center border border-dashed px-2 text-center text-xs ${
            tone === "dark"
              ? "border-white/30 text-white/70"
              : "border-[#dccfbc] bg-[#f7f0e6] text-[#6c6054]"
          }`}
        >
          暂无图片
        </div>
      )}
      <figcaption className={`mt-1 text-xs ${caption}`}>{label}</figcaption>
    </figure>
  );
}

function SourceThumbs({
  originalUrl,
  paintingUrl,
  tone,
  onOpen,
}: {
  originalUrl?: string | null;
  paintingUrl?: string | null;
  tone: "light" | "dark";
  onOpen: (src: string, alt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <SourceThumb url={originalUrl} label="用户上传的图片" tone={tone} onOpen={onOpen} />
      <SourceThumb url={paintingUrl} label="AI 生成的图片" tone={tone} onOpen={onOpen} />
    </div>
  );
}

function FilePickButton({
  label,
  accept,
  file,
  disabled,
  inputRef,
  onFile,
}: {
  label: string;
  accept: string;
  file: File | null;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => onFile(event.target.files?.[0] || null)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] border border-[#31271f] px-4 text-sm font-semibold text-[#31271f] disabled:opacity-40"
      >
        选择文件
      </button>
      <p className="mt-2 truncate text-xs text-[#6c6054]">{file ? file.name : "未选择文件"}</p>
    </div>
  );
}

/** PUT to a Supabase signed upload URL with byte-level progress. */
function uploadWithProgress(
  file: File,
  uploadUrl: string,
  onProgress: (loaded: number) => void,
  contentType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        reject(new Error(`上传失败（${xhr.status}）`));
      }
    };
    xhr.onerror = () => reject(new Error("网络中断，上传失败"));
    xhr.send(file);
  });
}

type UploadProgress = { label: string; percent: number } | null;

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
  const [progress, setProgress] = useState<UploadProgress>(null);
  const [trackingCompany, setTrackingCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const openPreview = useCallback((src: string, alt: string) => {
    setPreview({ src, alt });
  }, []);

  useEffect(() => {
    if (!preview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

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
      if (!res.ok || !json.ok) throw new Error(json.error || "订单加载失败");
      setOrder(json.order);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "订单加载失败");
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

  async function postAction(payload: Record<string, unknown>) {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      router.replace("/");
      throw new Error("登录已过期");
    }
    const json = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !json.ok) {
      const prefix =
        res.status === 409
          ? "订单状态已变化，请刷新页面后重试"
          : res.status === 422
            ? "Shopify 发货失败"
            : res.status === 502
              ? "Shopify 状态同步失败"
              : "操作失败";
      throw new Error(json.error ? `${prefix}（${json.error}）` : prefix);
    }
    return json;
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!imageFile || !videoFile) {
      setError("成品图和工作室视频都要上传");
      return;
    }
    const imageType = contentTypeForUpload(imageFile, "image");
    const videoType = contentTypeForUpload(videoFile, "video");
    if (!imageType || !videoType) {
      setError(
        !imageType
          ? "成品图格式不支持。请使用 JPG、PNG、WebP、HEIC 或 GIF"
          : "视频格式不支持。请使用 MP4、MOV、M4V、WebM 或 3GP",
      );
      return;
    }
    setBusy(true);
    setError("");
    const total = imageFile.size + videoFile.size;
    const report = (label: string, loaded: number) =>
      setProgress({ label, percent: Math.min(100, Math.round((loaded / total) * 100)) });
    try {
      report("正在准备上传…", 0);
      const [imageSigned, videoSigned] = await Promise.all([
        postAction({ action: "create_upload_url", kind: "image", contentType: imageType }),
        postAction({ action: "create_upload_url", kind: "video", contentType: videoType }),
      ]);

      await uploadWithProgress(
        imageFile,
        imageSigned.uploadUrl,
        (loaded) => report("正在上传成品图…", loaded),
        imageType,
      );
      await uploadWithProgress(
        videoFile,
        videoSigned.uploadUrl,
        (loaded) => report("正在上传工作室视频…", imageFile.size + loaded),
        videoType,
      );

      report("正在提交给客户审阅…", total);
      await postAction({
        action: "confirm_upload",
        imagePath: imageSigned.path,
        videoPath: videoSigned.path,
      });
      setImageFile(null);
      setVideoFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      setProgress(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "上传失败");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function onShip(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await postAction({ action: "ship", trackingCompany, trackingNumber });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发货失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return <p className="p-8 text-sm text-[#6c6054]">正在加载订单…</p>;
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorNotice message={error || "找不到这个订单"} />
        <Link href="/orders" className="mt-4 inline-block text-sm underline">
          返回订单列表
        </Link>
      </main>
    );
  }

  const blocked = Boolean(order.blockedReason);
  const canUpload =
    !blocked &&
    (order.businessStatus === "order_placed" ||
      order.businessStatus === "supplier_modification");
  const canShip = !blocked && order.businessStatus === "prepare_shipment";
  const nextVersion = order.nextVersion ?? (order.versionCount || 0) + 1;
  const isRevision = order.businessStatus === "supplier_modification";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <Link href="/orders?tab=action" className="text-sm text-[#6c6054] hover:text-[#241c16]">
        ← 返回订单列表
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-[#241c16]">{order.name}</h1>
        <span className="rounded-full border border-[#dccfbc] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold text-[#5f564b]">
          {statusLabel(order.businessStatus)}
        </span>
      </header>
      <p className="mt-2 text-sm text-[#6c6054]">
        {order.email || "无邮箱"} · 下单于 {formatTime(order.createdAt)}
      </p>

      {error ? <ErrorNotice message={error} /> : null}

      <section className="mt-6 rounded-[12px] border border-[#31271f] bg-[#31271f] p-5 text-white md:p-6">
        <h2 className="text-xl font-semibold">这一步要做什么</h2>
        {blocked ? (
          <p className="mt-3 text-sm text-white/85">
            这个订单已取消或已全额退款，不需要继续处理（{order.blockedReason}）。
          </p>
        ) : null}
        {canUpload ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {isRevision && latestRequest ? (
              <div>
                <p className="text-sm text-white/80">
                  客户针对第 {latestRequest.againstVersion} 版提交了 {latestRequest.notes.length} 条修改意见。
                  请按意见修改后上传第 {nextVersion} 版（最多 {MAX_PORTRAIT_VERSIONS} 版）。
                </p>
                <div className="mt-4">
                  <SourceThumbs
                    originalUrl={order.originalPhotoUrl}
                    paintingUrl={order.paintingUrl}
                    tone="dark"
                    onOpen={openPreview}
                  />
                </div>
                <div className="mt-4">
                  <NoteOverlay notes={latestRequest.notes} imageUrl={annotatedImage} />
                </div>
                <div className="mt-4">
                  <NoteList notes={latestRequest.notes} dark />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/80">
                  参照用户上传的图片和 AI 生成的图片完成画作，然后上传第 {nextVersion} 版的成品图和工作室视频。
                </p>
                <div className="mt-4">
                  <SourceThumbs
                    originalUrl={order.originalPhotoUrl}
                    paintingUrl={order.paintingUrl}
                    tone="dark"
                    onOpen={openPreview}
                  />
                </div>
              </div>
            )}

            <form onSubmit={onUpload} className="rounded-[10px] bg-white p-4 text-[#241c16]">
              <h3 className="text-lg font-semibold">
                {isRevision
                  ? `上传修改后的图和视频（第 ${nextVersion} 版）`
                  : `上传成品（第 ${nextVersion} 版）`}
              </h3>
              <p className="mt-1 text-xs text-[#6c6054]">两样都上传后才能提交给客户审阅。</p>
              <FilePickButton
                label="成品图（JPG / PNG / WebP / HEIC / GIF）"
                accept={IMAGE_ACCEPT}
                file={imageFile}
                disabled={busy}
                inputRef={imageInputRef}
                onFile={setImageFile}
              />
              <FilePickButton
                label="工作室视频（MP4 / MOV / M4V / WebM / 3GP）"
                accept={VIDEO_ACCEPT}
                file={videoFile}
                disabled={busy}
                inputRef={videoInputRef}
                onFile={setVideoFile}
              />
              {progress ? (
                <div className="mt-4" role="status" aria-live="polite">
                  <div className="flex justify-between text-xs text-[#6c6054]">
                    <span>{progress.label}</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div
                    className="mt-1 h-2 overflow-hidden rounded-full bg-[#efe8dd]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.percent}
                  >
                    <div
                      className="h-full rounded-full bg-[#31271f] transition-[width] duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={busy || !imageFile || !videoFile}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "上传中…" : "提交给客户审阅"}
              </button>
            </form>
          </div>
        ) : null}

        {canShip ? (
          <form onSubmit={onShip} className="mt-4 max-w-md rounded-[10px] bg-white p-4 text-[#241c16]">
            <p className="text-sm text-[#6c6054]">
              客户已批准第 {order.versionCount} 版。填写物流商和单号后，Shopify 订单会标记为已发货，并由 Shopify 给客户发送发货邮件。
            </p>
            <label className="mt-4 block text-sm font-medium">
              物流商
              <input
                className="mt-2 w-full rounded-[8px] border border-[#dccfbc] px-3 py-3"
                value={trackingCompany}
                onChange={(e) => setTrackingCompany(e.target.value)}
                placeholder="UPS / FedEx / DHL"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              物流单号
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
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "提交中…" : "确认发货"}
            </button>
          </form>
        ) : null}

        {!blocked && order.businessStatus === "portrait_review" ? (
          <p className="mt-3 text-sm text-white/85">
            已提交第 {order.versionCount} 版，等待客户确认。客户批准或提出修改前，这里没有需要你做的事。
          </p>
        ) : null}

        {order.businessStatus === "shipped" ? (
          <p className="mt-3 text-sm text-white/85">
            已发货：{order.trackingCompany || "物流商"} · {order.trackingNumber || "—"}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[12px] border border-[#dccfbc] bg-white p-5">
          <h2 className="text-lg font-semibold">订单信息</h2>
          {order.lineItems.map((line, index) => {
            const frame = attr(line, "frame");
            const keywords = attr(line, "keywords");
            return (
              <div key={index} className="mt-4 border-t border-[#efe8dd] pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold">
                  {line.title}
                  {line.variantTitle ? ` · ${line.variantTitle}` : ""} × {line.quantity ?? 1}
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#6c6054]">风格</dt>
                    <dd className="font-medium">
                      {attr(line, "style") || order.paintingStyle || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6c6054]">尺寸</dt>
                    <dd className="font-medium">{attr(line, "size") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6c6054]">装裱方式</dt>
                    <dd className="font-medium">
                      {attr(line, "presentation") || attr(line, "finish_type") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6c6054]">画框</dt>
                    <dd className="font-medium">{frame || "无"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6c6054]">宠物数量</dt>
                    <dd className="font-medium">{attr(line, "subjects") || "—"}</dd>
                  </div>
                  {keywords ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[#6c6054]">关键词</dt>
                      <dd className="font-medium">{keywords}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            );
          })}
          <dl className="mt-4 grid gap-3 border-t border-[#efe8dd] pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6c6054]">订单金额</dt>
              <dd className="font-medium">
                {order.total
                  ? `${order.total.currencyCode} ${order.total.amount}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6c6054]">礼品留言</dt>
              <dd className="font-medium whitespace-pre-line">{order.giftMessage || "—"}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <SourceThumbs
              originalUrl={order.originalPhotoUrl}
              paintingUrl={order.paintingUrl}
              tone="light"
              onOpen={openPreview}
            />
          </div>
        </article>

        <article className="rounded-[12px] border border-[#dccfbc] bg-white p-5">
          <h2 className="text-lg font-semibold">收货信息</h2>
          {order.shippingAddress ? (
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[#6c6054]">收货人</dt>
                <dd className="font-medium">
                  {order.shippingAddress.name ||
                    [order.shippingAddress.firstName, order.shippingAddress.lastName]
                      .filter(Boolean)
                      .join(" ")}
                </dd>
              </div>
              <div>
                <dt className="text-[#6c6054]">电话</dt>
                <dd className="font-medium">{order.shippingAddress.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#6c6054]">地址</dt>
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
            <p className="mt-4 text-sm text-[#6c6054]">没有收货地址。</p>
          )}
        </article>
      </section>

      <section className="mt-6 rounded-[12px] border border-[#dccfbc] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">历史版本</h2>
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-[#31271f] underline"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? "收起" : "展开"}
          </button>
        </div>
        {order.versions.length === 0 ? (
          <p className="mt-3 text-sm text-[#6c6054]">还没有交过版本。</p>
        ) : historyOpen ? (
          <ul className="mt-4 grid gap-3">
            {order.versions
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
                      <strong>
                        第 {version.versionNumber} 版 · {req ? `${req.notes.length} 条说明` : "无修改意见"}
                      </strong>
                      <span className="text-xs text-[#6c6054]">{formatTime(version.createdAt)}</span>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
                      {req ? (
                        <NoteOverlay notes={req.notes} imageUrl={version.imageUrl} />
                      ) : version.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={version.imageUrl}
                          alt={`第 ${version.versionNumber} 版`}
                          className="w-full rounded-[8px] object-cover"
                        />
                      ) : null}
                      <div className="grid content-start gap-3">
                        {req ? <NoteList notes={req.notes} /> : null}
                        {version.videoUrl ? (
                          <video
                            src={version.videoUrl}
                            controls
                            preload="metadata"
                            className="w-full rounded-[8px] bg-black"
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <ul className="mt-3 grid gap-1 text-sm text-[#6c6054]">
            {order.versions.map((version) => {
              const req = order.modificationRequests.find(
                (r) => r.againstVersion === version.versionNumber,
              );
              return (
                <li key={version.versionNumber}>
                  第 {version.versionNumber} 版 · {req ? `${req.notes.length} 条说明` : "无修改意见"}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/75"
          role="dialog"
          aria-modal="true"
          aria-label={preview.alt}
          onClick={() => setPreview(null)}
        >
          <div className="flex justify-end p-3">
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-[8px] bg-white px-4 text-sm font-semibold text-[#241c16]"
              onClick={() => setPreview(null)}
            >
              关闭
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.alt}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
