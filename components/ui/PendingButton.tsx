"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel = "Salvando...",
  className,
  style,
  confirm,
}: {
  children: string;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      style={{ ...style, opacity: pending ? 0.65 : style?.opacity }}
      onClick={confirm ? (event) => { if (!window.confirm(confirm)) event.preventDefault(); } : undefined}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
