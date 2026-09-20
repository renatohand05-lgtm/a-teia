"use client";

import { useState } from "react";
import { COMPANY_SEGMENT_OPTIONS, segmentSelectValue } from "@/lib/company-ux";

export function SegmentSelect({
  name = "segment",
  defaultValue,
  helper = "Pode completar depois.",
}: {
  name?: string;
  defaultValue?: string | null;
  helper?: string;
}) {
  const initial = segmentSelectValue(defaultValue);
  const [value, setValue] = useState(initial);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
        Segmento
      </span>
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        name={value === "Outro" ? undefined : name}
        className="teia-select w-full"
        aria-label="Segmento"
      >
        <option value="">Não informado</option>
        {COMPANY_SEGMENT_OPTIONS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {value === "Outro" ? (
        <input
          name={name}
          defaultValue={initial === "Outro" ? defaultValue ?? "" : ""}
          className="teia-input mt-2"
          placeholder="Descreva o segmento"
          aria-label="Outro segmento"
        />
      ) : null}
      {helper ? (
        <span className="mt-1 block text-[11px]" style={{ color: "var(--text-3)" }}>
          {helper}
        </span>
      ) : null}
    </label>
  );
}
