import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingForm } from "@/components/companies/OnboardingForm";
import { saveOnboardingAction } from "@/app/empresas/diagnostic-actions";
import { requireOwnedCompany } from "@/lib/access";
import { getOnboarding } from "@/services/onboardingService";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const onboarding = await getOnboarding(userId, id);
  const bound = saveOnboardingAction.bind(null, company.id);

  return (
    <AppShell title="Onboarding" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar à empresa
        </Link>
        <OnboardingForm company={company} onboarding={onboarding} action={bound} />
      </div>
    </AppShell>
  );
}
