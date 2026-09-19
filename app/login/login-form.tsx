"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/app/login/actions";

const initial: ActionResult = { ok: true };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="mx-auto mt-8 w-full max-w-md space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
          E-mail
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="teia-input"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
          Senha
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="teia-input"
        />
      </label>
      {state && !state.ok ? <p className="text-[13px]" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
