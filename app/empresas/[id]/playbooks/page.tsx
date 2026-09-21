import { redirect } from "next/navigation";

export default async function CompanyPlaybooksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/playbooks?empresa=${id}`);
}
