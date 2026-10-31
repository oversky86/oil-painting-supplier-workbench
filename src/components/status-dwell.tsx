import { statusDwell } from "@/lib/status-dwell";

export function StatusDwellBadge({
  status,
  enteredAt,
}: {
  status: string;
  enteredAt?: string | null;
}) {
  const dwell = statusDwell(status, enteredAt);
  if (!dwell) return null;
  const tone =
    dwell.tone === "overdue"
      ? "border-[#E7B4B4] bg-[#FDECEC] text-[#9B2C2C]"
      : "border-[#E4D3A4] bg-[#FBF3D5] text-[#8A5A12]";
  return (
    <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-xs font-semibold ${tone}`}>
      {dwell.label}
    </span>
  );
}
