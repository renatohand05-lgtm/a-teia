"use client";

import { useState } from "react";

export function ConfirmForm({
  action,
  hidden,
  label,
  message,
  tone = "gold",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: string;
  message: string;
  tone?: "gold" | "danger" | "neutral";
}) {
  const [error, setError] = useState<string | null>(null);
  const style =
    tone === "danger"
      ? { background: "rgba(224,86,76,.12)", color: "var(--danger)", borderColor: "rgba(224,86,76,.3)" }
      : tone === "neutral"
        ? { background: "transparent", color: "var(--text-2)", borderColor: "var(--border)" }
        : { background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))", color: "#241a08", borderColor: "transparent" };

  return (
    <form
      action={async (formData) => {
        if (!window.confirm(message)) return;
        formData.set("confirm", "1");
        setError(null);
        try {
          await action(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível concluir.");
        }
      }}
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-extrabold" style={style}>
        {label}
      </button>
      {error ? (
        <p className="mt-2 text-[12px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
