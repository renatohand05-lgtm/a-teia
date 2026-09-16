import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--gold-soft)" }}>
        A Teia
      </p>
      <h1 className="mt-3 text-2xl font-bold">Página não encontrada</h1>
      <Link href="/cockpit" className="mt-6 text-[13px] font-semibold" style={{ color: "var(--gold-soft)" }}>
        Voltar ao Cockpit
      </Link>
    </div>
  );
}
