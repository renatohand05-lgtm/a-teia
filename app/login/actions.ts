"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { clientIdentity, consumeNamedLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validations";
import { writeAudit } from "@/services/auditService";

export type ActionResult = { ok: true } | { ok: false; error: string };

function isNextRedirect(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).includes("NEXT_REDIRECT"),
  );
}

export async function loginAction(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const headerList = await headers();
  const identity = clientIdentity(headerList, parsed.data.email.toLowerCase());
  const limited = consumeNamedLimit("login", identity);
  if (!limited.ok) {
    return { ok: false, error: HUMAN_MESSAGES.rateLimited };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/cockpit",
    });
    await writeAudit({
      action: "auth.login.success",
      entity: "User",
      newValue: { email: parsed.data.email.toLowerCase() },
      success: true,
    }).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    if (isNextRedirect(error)) {
      await writeAudit({
        action: "auth.login.success",
        entity: "User",
        newValue: { email: parsed.data.email.toLowerCase() },
        success: true,
      }).catch(() => undefined);
      throw error;
    }
    if (error instanceof AuthError) {
      await writeAudit({
        action: "auth.login.failed",
        entity: "User",
        newValue: { email: parsed.data.email.toLowerCase() },
        success: false,
      }).catch(() => undefined);
      return { ok: false, error: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
