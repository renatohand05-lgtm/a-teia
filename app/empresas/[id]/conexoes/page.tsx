import { redirect } from "next/navigation";

export default async function CompanyConnectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/conexoes?empresa=${id}`);
}
