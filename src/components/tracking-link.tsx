import { carrierTrackingUrl } from "@/lib/tracking";

export function TrackingLink({
  company,
  number,
  url,
}: {
  company?: string | null;
  number?: string | null;
  url?: string | null;
}) {
  if (!company && !number) return null;
  const href = carrierTrackingUrl(company, number, url);
  return (
    <p className="mt-2 text-sm text-[#31271f]">
      <span className="text-[#6c6054]">物流 </span>
      {company ? <span className="font-medium">{company}</span> : null}
      {number ? (
        <>
          {company ? <span> · </span> : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#241c16] underline"
            >
              {number}
            </a>
          ) : (
            <span className="font-medium">{number}</span>
          )}
        </>
      ) : null}
    </p>
  );
}
