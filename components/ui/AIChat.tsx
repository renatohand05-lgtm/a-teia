"use client";

import { useState } from "react";

type Msg = { role: "system" | "user" | "ai"; text: string };

export function AIChat({
  disabledReason = "Ações críticas exigem confirmação humana.",
}: {
  disabledReason?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      text: "Sou o Assistente Executivo do A TEIA. Registro a pergunta e devolvo o estado da arquitetura — sem executar ações.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, useWebSearch: false }),
      });
      const json = (await res.json()) as { content?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: json.content ?? json.error ?? "Não foi possível responder agora." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Falha de rede ao falar com /api/ai." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-[22px] border p-[22px]"
      style={{
        background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",
        borderColor: "rgba(232,191,122,.18)",
      }}
    >
      <div className="mb-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-[#8fe3ab]"
          style={{ background: "rgba(52,199,111,.1)", borderColor: "rgba(52,199,111,.25)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#34c76f] shadow-[0_0_12px_rgba(52,199,111,.8)]" />
          Assistente Executivo da Teia
        </span>
        <h3 className="mt-2 text-[21px]">Converse com seus dados</h3>
        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {disabledReason}
        </p>
      </div>
      <div
        className="flex h-[280px] flex-col gap-2.5 overflow-auto rounded-[18px] border p-3"
        style={{ background: "rgba(0,0,0,.22)", borderColor: "var(--border)" }}
      >
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
              msg.role === "user" ? "self-end font-semibold text-[#241a08]" : "self-start"
            }`}
            style={
              msg.role === "user"
                ? { background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }
                : msg.role === "system"
                  ? {
                      alignSelf: "center",
                      maxWidth: "96%",
                      background: "rgba(10,132,255,.08)",
                      border: "1px solid rgba(10,132,255,.2)",
                      color: "#9fcbff",
                    }
                  : { background: "rgba(255,255,255,.055)", border: "1px solid var(--border)" }
            }
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: Qual empresa devo atender primeiro amanhã?"
          className="min-h-[74px] resize-y rounded-[14px] border px-3.5 py-3 text-[12.5px] outline-none"
          style={{ background: "rgba(255,255,255,.045)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="min-w-[105px] rounded-[14px] px-4 font-extrabold text-[#241a08] disabled:opacity-45"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {busy ? "..." : "Perguntar"}
        </button>
      </div>
    </div>
  );
}
