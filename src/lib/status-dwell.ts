const SHANGHAI = "Asia/Shanghai";

const RULES: Record<string, { yellow: number; red: number }> = {
  order_placed: { yellow: 8, red: 10 },
  prepare_shipment: { yellow: 4, red: 5 },
  shipped: { yellow: 10, red: 13 },
};

/** Entry date is day 1. Day 10 overdue is "已超时1天". */
export function calendarDayIndex(iso: string, now = new Date()): number {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const start = Date.parse(`${format.format(new Date(iso))}T00:00:00Z`);
  const today = Date.parse(`${format.format(now)}T00:00:00Z`);
  return Math.round((today - start) / 86_400_000) + 1;
}

export function statusDwell(
  status: string,
  enteredAt: string | null | undefined,
  now = new Date(),
): { tone: "waiting" | "overdue"; label: string } | null {
  const rule = RULES[status];
  if (!rule || !enteredAt) return null;
  const day = calendarDayIndex(enteredAt, now);
  if (!Number.isFinite(day) || day < rule.yellow) return null;
  if (day >= rule.red) {
    return { tone: "overdue", label: `已超时${day - rule.red + 1}天` };
  }
  return { tone: "waiting", label: `已等待${day}天` };
}
