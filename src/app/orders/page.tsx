"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  primaryActionLabel,
  statusLabel,
  type SupplierOrderListItem,
} from "@/lib/types";

type Tab = "action" | "waiting" | "done";

const tabs: Array<{ id: Tab; label: string; empty: string }> = [
  {
    id: "action",
    label: "Needs action",
    empty: "No orders need your attention right now.",
  },
  {
    id: "waiting",
    label: "Waiting on customer",
    empty: "No orders are waiting on customer review.",
  },
  {
    id: "done",
    label: "Completed",
    empty: "No shipped orders yet.",
  },
];

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
            throw new Error(json.error || `Failed to load ${t}`);
          }
          nextCounts[t] = Array.isArray(json.orders) ? json.orders.length : 0;
          if (t === active) setOrders(json.orders || []);
        });
        setCounts(nextCounts);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to load");
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
            Supplier workbench
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6c6054]">
            Work the queue top-down. Needs-action orders stay separate from customer
            waiting and shipped work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex min-h-11 items-center rounded-[8px] border border-[#dccfbc] bg-white px-4 text-sm font-medium text-[#31271f]"
        >
          Sign out
        </button>
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

      {error ? (
        <p className="mt-6 rounded-[8px] border border-[#f0c2be] bg-[#fff5f4] px-4 py-3 text-sm text-[#a33b35]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-[#6c6054]">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-[12px] border border-dashed border-[#dccfbc] bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[#241c16]">
            {tabs.find((t) => t.id === tab)?.empty}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${encodeURIComponent(order.id)}`}
                className="grid gap-4 rounded-[12px] border border-[#dccfbc] bg-white p-4 transition hover:border-[#31271f] md:grid-cols-[1fr_auto] md:items-center md:p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="text-lg text-[#241c16]">
                      {order.orderName}
                    </strong>
                    <span className="rounded-full border border-[#dccfbc] bg-[#f7f0e6] px-3 py-1 text-xs font-semibold text-[#5f564b]">
                      {statusLabel(order.businessStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#6c6054]">
                    {order.email || "No email"} · placed{" "}
                    {new Date(order.placedAt).toLocaleString()}
                    {order.modificationCount
                      ? ` · ${order.modificationCount} modification request(s) · version ${order.versionCount}`
                      : order.versionCount
                        ? ` · version ${order.versionCount}`
                        : ""}
                  </p>
                </div>
                <span className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#31271f] px-4 text-sm font-semibold text-white">
                  {primaryActionLabel(order.businessStatus)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-[#6c6054]">Loading…</p>}>
      <OrdersInner />
    </Suspense>
  );
}
