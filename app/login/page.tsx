import { BrandHeader } from "@/components/layout/BrandHeader";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 lg:py-16">
      <BrandHeader />
      <LoginForm />
      <p className="mt-8 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
        Uso pessoal · um usuário principal nesta fase.
        <br />
        A TEIA não expõe chaves, tokens ou credenciais no frontend.
      </p>
    </div>
  );
}
