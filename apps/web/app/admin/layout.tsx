import { redirect } from "next/navigation";
import { PawIcon } from "@/components/icons";
import { AdminNav } from "@/components/admin/AdminNav";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { getDisplayName } from "@/lib/auth/display-name";
import { requireUser } from "@/lib/auth/require-user";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/admin");

  // El rol admin vive en app_metadata (solo editable con la service role
  // key, nunca por el propio usuario) — a diferencia de profiles.roles,
  // que el usuario puede editar. Así evitamos que alguien se autoasigne
  // admin actualizando su propio perfil.
  const role = (user.app_metadata as { role?: string } | null)?.role;
  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="sticky top-0 z-40 border-b border-background/10 bg-foreground/95 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
              <PawIcon className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Pimi admin
            </span>
          </a>
          <UserMenu
            name={getDisplayName(user)}
            email={user.email ?? ""}
            homeHref="/admin"
          />
        </nav>
        <AdminNav />
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
