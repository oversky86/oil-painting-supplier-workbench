"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ErrorNotice } from "@/components/error-notice";
import {
  primaryActionLabel,
  statusLabel,
  statusSentence,
  type SupplierOrderListItem,
} from "@/lib/types";

type Tab = "action" | "waiting" | "done";

const tabs: Array<{ id: Tab; label: string; empty: string }> = [
  {
    id: "action",
    label: "待处理",
    empty: "没有需要你处理的订单",
  },
  {
    id: "waiting",
    label: "等待客户",
    empty: "没有等待客户确认的订单",
  },
  {
    id: "done",
    label: "已完成",
    empty: "还没有已发货的订单",
  },
];

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

async function fetchTab(tab: Tab) {
  const res = await fetch(`/api/orders?tab=${tab}`, { credentials: "same-origin" });
  const json = await res.json().catch(() => ({ ok: false }));
  return { res, json };
}

function OrdersInner() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = (search.get("tab") as Tab) || "action";
  const [orders, setOrders] = useState<SupplierOrderListItem[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({
    action: 0,
    waiting: 0,
    done: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shop, setShop] = useState("");
  const [shops, setShops] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!preview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setShop(typeof json.shop === "string" ? json.shop : "");
        setShops(Array.isArray(json.shops) ? json.shops : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(
    async (active: Tab) => {
      setLoading(true);
      setError("");
      try {
        const results = await Promise.all(
          (["action", "waiting", "done"] as Tab[]).map((t) => fetchTab(t)),
        );
        if (results.some((r) => r.res.status === 401)) {
          router.replace("/");
          return;
        }

        const nextCounts: Record<Tab, number> = {
          action: 0,
          waiting: 0,
          done: 0,
        };
        (["action", "waiting", "done"] as Tab[]).forEach((t, index) => {
          const { res, json } = results[index];
          if (!res.ok || !json.ok) {
            throw new Error(json.error || "订单加载失败");
          }
          nextCounts[t] = Array.isArray(json.orders) ? json.orders.length : 0;
          if (t === active) setOrders(json.orders || []);
        });
        setCounts(nextCounts);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "订单加载失败");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806e5a]">
            ViewBrush Studio
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[#241c16] md:text-4xl">
            供应商工作台
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6c6054]">
            从上往下处理待处理订单。等待客户和已完成的订单分开放，不会混在一起。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shops.length > 1 ? (
            <label className="flex min-h-11 items-center gap-2 text-sm text-[#31271f]">
              <span>店铺</span>
              <select
                value={shop}
                onChange={(event) => {
                  const next = event.target.value;
                  setShop(next);
                  void fetch("/api/auth", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "switch-shop", shop: next }),
                  }).then(() => load(tab));
                }}
                className="min-h-11 rounded-[8px] border border-[#dccfbc] bg-white px-3"
              >
                {shops.map((item) => (
                  <option key={item} value={item}>
                    {item === "6hcr01-9t.myshopify.com" ? "线上店" : "开发店"} {item}
                  </option>
                ))}
              </select>
            </label>
          ) : shops.length === 1 ? (
            <p className="inline-flex min-h-11 items-center text-sm text-[#31271f]">线上店</p>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-11 items-center rounded-[8px] border border-[#dccfbc] bg-white px-4 text-sm font-medium text-[#31271f]"
          >
            退出登录
          </button>
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-[#e7dccc] pb-3">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/orders?tab=${item.id}`}
              className={`inline-flex min-h-11 items-center rounded-[8px] px-4 text-sm font-semibold ${
                active
                  ? "bg-[#31271f] text-white"
                  : "border border-[#dccfbc] bg-white text-[#31271f]"
              }`}
            >
              {item.label}
              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                {counts[item.id]}
              </span>
            </Link>
          );
        })}
      </nav>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <p className="mt-10 text-sm text-[#6c6054]">正在加载订单…</p>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-[12px] border border-dashed border-[#dccfbc] bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[#241c16]">
            {tabs.find((t) => t.id === tab)?.empty}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {orders.map((order) => {
            const paintingAlt = `${order.orderName} 的 AI 生成图`;
            return (
              <li
                key={order.id}
                className="grid gap-4 rounded-[12px] border border-[#dccfbc] bg-white p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:p-5"
              >
                {order.paintingUrl ? (
                  <button
                    type="button"
                    className="h-24 w-24 overflow-hidden rounded-[8px] border border-[#dccfbc]"
                    onClick={() => setPreview({ src: order.paintingUrl || "", alt: paintingAlt })}
                    aria-label={`查看${paintingAlt}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.paintingUrl}
                      alt={paintingAlt}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[8px] border border-dashed border-[#dccfbc] bg-[#f7f0e6] px-2 text-center text-xs text-[#6c6054]">
                    暂无图片
                  </div>
                )}
                <Link
                  href={`/orders/${encodeURIComponent(order.id)}`}
                  className="min-w-0 rounded-[8px] transition hover:text-[#241c16]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="text-lg text-[#241c16]">
                      {order.orderName}
                    </strong>
                    <span className="rounded-full border border-[#dccfbc] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold text-[#5f564b]">
                      {statusLabel(order.businessStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#31271f]">
                    {statusSentence(order)}
                  </p>
                  <p className="mt-1 text-sm text-[#6c6054]">
                    {order.email || "无邮箱"} · 下单于 {formatTime(order.placedAt)}
                  </p>
                </Link>
                <Link
                  href={`/orders/${encodeURIComponent(order.id)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white"
                >
                  {primaryActionLabel(order.businessStatus)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

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

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-[#6c6054]">加载中…</p>}>
      <OrdersInner />
    </Suspense>
  );
}
