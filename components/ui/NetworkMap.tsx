import { DemoBadge } from "@/components/ui/DemoBadge";

const NODES = [
  { left: "17.5%", top: "17%", label: "⚙ Autopeças", tone: "n-y" },
  { left: "50%", top: "13%", label: "🛡 Seguradora", tone: "n-g" },
  { left: "82%", top: "19%", label: "🚿 Lava-rápido", tone: "n-r" },
  { left: "86%", top: "37%", label: "✨ Estética Automotiva", tone: "n-v" },
  { left: "87.5%", top: "54%", label: "◉ Pneus", tone: "n-c" },
  { left: "82%", top: "72%", label: "▣ Baterias", tone: "n-y" },
  { left: "67.5%", top: "86%", label: "🚚 Guincho", tone: "n-g" },
  { left: "49.5%", top: "89%", label: "📄 Despachante", tone: "n-v" },
  { left: "31.5%", top: "85%", label: "🚘 Compra e Venda", tone: "n-r" },
  { left: "15.5%", top: "71%", label: "Ⓟ Estacionamento", tone: "n-g" },
  { left: "13.5%", top: "53%", label: "⌖ Rastreador", tone: "n-c" },
  { left: "17%", top: "35%", label: "❄ Ar-condicionado", tone: "n-y" },
];

const LINES: Array<[number, number, number, number]> = [
  [500, 250, 175, 85],
  [500, 250, 500, 65],
  [500, 250, 820, 95],
  [500, 250, 860, 185],
  [500, 250, 875, 270],
  [500, 250, 820, 360],
  [500, 250, 675, 430],
  [500, 250, 495, 445],
  [500, 250, 315, 425],
  [500, 250, 155, 355],
  [500, 250, 135, 265],
  [500, 250, 170, 175],
];

const TONE: Record<string, string> = {
  "n-y": "rgba(255,159,10,.5)",
  "n-g": "rgba(52,199,111,.5)",
  "n-r": "rgba(224,86,76,.5)",
  "n-v": "rgba(191,90,242,.5)",
  "n-c": "rgba(45,181,211,.5)",
};

export function NetworkMap() {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-[15px] font-bold">Mapa da Teia</h3>
          <p className="m-0 text-[12px]" style={{ color: "var(--text-2)" }}>
            GESTÃO NO FOCO no núcleo. Segmentos ilustrativos da V9.
          </p>
        </div>
        <DemoBadge />
      </div>
      <div
        className="network-dot relative h-[340px] overflow-hidden rounded-[18px] border md:h-[460px]"
        style={{
          background:
            "radial-gradient(circle at center,rgba(61,113,255,.20),rgba(9,18,33,.98) 55%),linear-gradient(180deg,#0e1728,#09111e)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 500" preserveAspectRatio="none">
          {LINES.map(([x1, y1, x2, y2]) => (
            <line key={`${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(115,162,255,.35)" strokeWidth="1.3" />
          ))}
        </svg>
        <div
          className="absolute flex h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center text-[9px] font-extrabold leading-tight text-[#241a08]"
          style={{
            left: "50%",
            top: "50%",
            background: "linear-gradient(145deg,#f4d9a6,#c99347)",
            boxShadow: "0 0 0 10px rgba(232,191,122,.14),0 18px 42px rgba(153,110,30,.45)",
          }}
        >
          🎯
          <br />
          GESTÃO NO FOCO
        </div>
        {NODES.map((node) => (
          <div
            key={node.label}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10.5px]"
            style={{
              left: node.left,
              top: node.top,
              background: "rgba(17,27,45,.96)",
              borderColor: TONE[node.tone],
              color: "#eaf0fa",
              boxShadow: "0 8px 22px rgba(0,0,0,.35)",
            }}
          >
            {node.label}
          </div>
        ))}
        <div className="absolute right-4 bottom-3 text-[8.5px] tracking-[0.1em] text-[#5c759f]">
          A TEIA · INTELIGÊNCIA EM CONEXÕES
        </div>
      </div>
    </div>
  );
}
