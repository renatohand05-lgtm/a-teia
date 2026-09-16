import { logoutAction } from "@/app/login/actions";

export function Topbar({
  title,
  subtitle,
  userName,
}: {
  title: string;
  subtitle?: string;
  userName?: string | null;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 lg:px-8"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(24px) saturate(160%)",
      }}
    >
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--gold-soft)" }}>
          Centro de decisão
        </p>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.01em]">{title}</h1>
        {subtitle ? (
          <p className="m-0 text-[13px]" style={{ color: "var(--text-2)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[11px] font-semibold">{userName ?? "Usuário principal"}</p>
          <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Uso pessoal
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border px-3 py-2 text-[12px] font-bold"
            style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "rgba(255,255,255,0.04)" }}
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
