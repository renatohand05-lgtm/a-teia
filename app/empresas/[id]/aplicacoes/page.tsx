import { redirect } from "next/navigation";

export default async function CompanyApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/aplicacoes?destino=${id}`);
}
