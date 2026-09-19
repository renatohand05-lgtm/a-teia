import { logoutAction } from "@/app/login/actions";
import { showCountBadge } from "@/lib/cockpit-ui";

export function Topbar({
  title,
  subtitle,
  userName,
  alertCount = 0,
  onOpenMenu,
}: {
  title: string;
  subtitle?: string;
  userName?: string | null;
  alertCount?: number;
  onOpenMenu?: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-3 lg:px-8"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(24px) saturate(160%)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg border px-2.5 py-2 text-[12px] font-bold lg:hidden"
            style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
            aria-label="Abrir menu"
          >
            Menu
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="m-0 truncate text-[20px] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle ? (
            <p className="m-0 truncate text-[12px]" style={{ color: "var(--text-2)" }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href="/automacoes#alertas"
          className="relative rounded-xl border px-3 py-2 text-[12px] font-bold transition hover:bg-white/[0.04]"
          style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}
        >
          Alertas
          {showCountBadge(alertCount) ? (
            <span
              className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold text-[#241a08]"
              style={{ background: "var(--gold)" }}
            >
              {alertCount}
            </span>
          ) : null}
        </a>
        <div className="hidden text-right sm:block">
          <p className="text-[12px] font-semibold">{userName ?? "Usuário"}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border px-3 py-2 text-[12px] font-bold transition hover:bg-white/[0.04]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
