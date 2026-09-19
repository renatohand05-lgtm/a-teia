export function CalculationHelp({ label, text }: { label: string; text: string }) {
  return (
    <details className="text-[11px]" style={{ color: "var(--text-3)" }}>
      <summary className="cursor-pointer font-semibold" style={{ color: "var(--gold-soft)" }}>
        Como calculamos · {label}
      </summary>
      <p className="mt-1 leading-relaxed">{text}</p>
    </details>
  );
}
