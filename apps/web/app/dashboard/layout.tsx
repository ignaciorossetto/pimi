import { OwnerNav } from "@/components/dashboard/OwnerNav";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/dashboard");

  return (
    <div className="min-h-screen">
      <OwnerNav user={user} />
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
