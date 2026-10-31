import { carrierTrackingUrl } from "@/lib/tracking";

export function TrackingLink({
  company,
  number,
  url,
  prominent = false,
}: {
  company?: string | null;
  number?: string | null;
  url?: string | null;
  prominent?: boolean;
}) {
  if (!company && !number) return null;
  const href = carrierTrackingUrl(company, number, url);
  const numberNode = number ? (
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={
          prominent
            ? "inline-flex min-h-12 items-center text-3xl font-semibold tracking-tight text-[#241c16] underline decoration-2 underline-offset-[6px]"
            : "font-medium text-[#241c16] underline"
        }
      >
        {number}
      </a>
    ) : (
      <span className={prominent ? "text-3xl font-semibold tracking-tight text-[#241c16]" : "font-medium"}>
        {number}
      </span>
    )
  ) : null;

  if (!prominent) {
    return (
      <p className="mt-2 text-sm text-[#31271f]">
        <span className="text-[#6c6054]">物流 </span>
        {company ? <span className="font-medium">{company}</span> : null}
        {number ? (
          <>
            {company ? <span> · </span> : null}
            {numberNode}
          </>
        ) : null}
      </p>
    );
  }

  return (
    <section className="mt-5 rounded-[12px] border-2 border-[#31271f] bg-white px-5 py-5 md:px-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#806e5a]">物流</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {company ? <p className="text-3xl font-semibold tracking-tight text-[#241c16]">{company}</p> : null}
        {numberNode}
      </div>
    </section>
  );
}
