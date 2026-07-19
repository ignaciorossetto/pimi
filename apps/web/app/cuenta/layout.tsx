import { requireUser } from "@/lib/auth/require-user";

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("/cuenta");

  return (
    <div className="min-h-screen bg-surface">
      <main className="mx-auto max-w-lg px-6 py-10">{children}</main>
    </div>
  );
}
