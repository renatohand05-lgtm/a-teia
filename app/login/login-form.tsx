"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/app/login/actions";

const initial: ActionResult = { ok: true };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="mx-auto mt-8 w-full max-w-md space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          E-mail
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-xl border px-3 py-3 text-[14px] outline-none"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Senha
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="w-full rounded-xl border px-3 py-3 text-[14px] outline-none"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
        />
      </label>
      {state && !state.ok ? <p className="text-[13px] text-[#f09a93]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl py-3 text-[14px] font-extrabold text-[#241a08] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        {pending ? "Entrando..." : "Entrar no Cockpit"}
      </button>
    </form>
  );
}
