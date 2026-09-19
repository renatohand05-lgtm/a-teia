export function FormField({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  placeholder,
  helper,
  error,
  inputMode,
  maxLength,
  autoFocus,
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const errorId = error ? `${name}-error` : undefined;
  const helperId = helper ? `${name}-helper` : undefined;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
        {label}
        {required ? (
          <span className="ml-1" style={{ color: "var(--gold-soft)" }} aria-hidden>
            *
          </span>
        ) : null}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={[errorId, helperId].filter(Boolean).join(" ") || undefined}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none disabled:opacity-50"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: error ? "rgba(224,86,76,.55)" : "var(--border)",
          color: "var(--text-1)",
        }}
      />
      {helper ? (
        <span id={helperId} className="mt-1 block text-[11px]" style={{ color: "var(--text-3)" }}>
          {helper}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="mt-1 block text-[11px] text-[#f09a93]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function FormArea({
  name,
  label,
  defaultValue,
  helper,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />
      {helper ? (
        <span className="mt-1 block text-[11px]" style={{ color: "var(--text-3)" }}>
          {helper}
        </span>
      ) : null}
    </label>
  );
}

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) return <p className="text-[12px] text-[#f09a93]">{error}</p>;
  if (success) return <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>{success}</p>;
  return null;
}
