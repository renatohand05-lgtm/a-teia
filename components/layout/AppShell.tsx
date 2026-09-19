import { auth } from "@/auth";
import { AppFrame } from "@/components/layout/AppFrame";
import { countOpenOwnerAlerts } from "@/services/automationService";

export async function AppShell({
  title,
  subtitle,
  userName,
  children,
}: {
  title: string;
  subtitle?: string;
  userName?: string | null;
  children: React.ReactNode;
}) {
  const session = await auth();
  const alertCount = session?.user?.id ? await countOpenOwnerAlerts(session.user.id) : 0;

  return (
    <AppFrame title={title} subtitle={subtitle} userName={userName} alertCount={alertCount}>
      {children}
    </AppFrame>
  );
}
