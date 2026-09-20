import { BrandHeader } from "@/components/layout/BrandHeader";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 lg:py-16">
      <BrandHeader />
      <p className="mt-6 text-center text-[15px] font-medium" style={{ color: "var(--text-2)" }}>
        Centro de Decisão Empresarial
      </p>
      <LoginForm />
      <p className="mt-8 text-center text-[12px] leading-relaxed" style={{ color: "var(--text-3)" }}>
        Acesso restrito.
      </p>
    </div>
  );
}
