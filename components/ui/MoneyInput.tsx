"use client";

import { useState } from "react";
import { displayMoneyInput, maskMoneyTyping, maskPercentTyping } from "@/lib/input-mask";

export function MoneyInput({
  name,
  defaultValue,
  required,
  placeholder = "0,00",
  className,
  ariaLabel,
  kind = "money",
}: {
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  kind?: "money" | "percent";
}) {
  const [value, setValue] = useState(() => displayMoneyInput(defaultValue));
  const mask = kind === "percent" ? maskPercentTyping : maskMoneyTyping;

  return (
    <input
      name={name}
      inputMode="decimal"
      required={required}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(event) => setValue(mask(event.target.value))}
      className={className ?? "teia-input"}
    />
  );
}
