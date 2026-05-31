"use client";

import { ogToIdr, formatIdr, formatOg } from "@/lib/currency";

/**
 * Displays an OG amount with an Indonesian-Rupiah reference.
 *
 * The Rp figure is display-only (settles in IDRX in V2) — see lib/currency.
 * Use `inline` for a single-line "X OG ≈ Rp Y", or the default stacked layout
 * for table cells / balance pills.
 */
export default function OgAmount({
  value,
  digits = 4,
  className = "",
  idrClassName = "",
  inline = false,
}: {
  value: number | string | null | undefined;
  digits?: number;
  className?: string;
  idrClassName?: string;
  inline?: boolean;
}) {
  const raw = typeof value === "string" ? parseFloat(value) : value ?? 0;
  const og = isFinite(raw as number) ? (raw as number) : 0;
  const idr = formatIdr(ogToIdr(og));

  if (inline) {
    return (
      <span className={className}>
        {formatOg(og, digits)}{" "}
        <span className={idrClassName || "text-white/30"} title="Reference rate — settles in IDRX (V2)">
          ≈ {idr}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span>{formatOg(og, digits)}</span>
      <span
        className={idrClassName || "text-[10px] text-white/30 font-mono"}
        title="Reference rate — settles in IDRX (V2)"
      >
        ≈ {idr}
      </span>
    </span>
  );
}
