"use client";

import { useEffect, useRef } from "react";

/** High-contrast failure banner. Scrolls itself into view so a submit error is not missed below the fold. */
export function ErrorNotice({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [message]);

  return (
    <div
      ref={ref}
      role="alert"
      className="mt-4 rounded-[10px] border-2 border-[#6e1612] bg-[#9b2c2c] px-5 py-4 text-white shadow-[0_8px_24px_rgba(110,22,18,0.28)]"
    >
      <p className="text-sm font-bold tracking-wide">操作失败</p>
      <p className="mt-1 text-lg font-semibold leading-7">{message}</p>
    </div>
  );
}
