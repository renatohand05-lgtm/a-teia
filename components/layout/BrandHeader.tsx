import Image from "next/image";
import { TeiaCanvas } from "@/components/layout/TeiaCanvas";

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden border shadow-[var(--shadow-lg)] ${
        compact ? "rounded-2xl px-6 py-6" : "rounded-[28px] px-10 py-11"
      }`}
      style={{
        borderColor: "rgba(232,191,122,0.16)",
        background:
          "radial-gradient(760px 420px at 50% -20%, rgba(232,191,122,0.14), transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))",
      }}
    >
      <TeiaCanvas />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
            compact ? "mb-3 h-16 w-16" : "mb-[18px] h-[132px] w-[132px]"
          }`}
          style={{
            boxShadow:
              "0 0 0 1px rgba(232,191,122,0.35), 0 0 50px -6px rgba(232,191,122,0.35), 0 22px 40px -12px rgba(0,0,0,0.7)",
            background: "radial-gradient(circle at 50% 42%, rgba(232,191,122,0.18), rgba(0,0,0,0.5) 72%)",
          }}
        >
          <Image src="/logo-teia.png" alt="A Teia" width={132} height={132} className="h-full w-full object-contain" />
        </div>
        <h1 className={`gold-text m-0 font-extrabold tracking-[0.06em] ${compact ? "text-2xl" : "text-[clamp(28px,4vw,42px)]"}`}>
          A Teia
        </h1>
        {!compact ? (
          <>
            <p className="mt-2.5 max-w-[520px] text-[15.5px] font-medium" style={{ color: "var(--text-2)" }}>
              Conexões que geram oportunidades. Todo negócio se conecta.
            </p>
            <div
              className="my-5 h-0.5 w-16 rounded-sm"
              style={{ background: "linear-gradient(90deg,transparent,var(--gold),transparent)" }}
            />
            <div
              className="flex flex-wrap justify-center gap-x-[18px] gap-y-2.5 text-[10.5px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--text-3)" }}
            >
              {["Ideias", "Estratégia", "Execução", "Resultados"].map((item, index, arr) => (
                <span key={item} className="inline-flex items-center gap-[18px]">
                  {item}
                  {index < arr.length - 1 ? <span style={{ color: "rgba(232,191,122,0.4)" }}>·</span> : null}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
