import { PawIcon } from "@/components/icons";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { getDisplayName } from "@/lib/auth/display-name";
import { requireUser } from "@/lib/auth/require-user";

export default async function CuidadorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/cuidador");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/cuidador" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
              <PawIcon className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Pimi cuidadores
            </span>
          </a>
          <UserMenu
            name={getDisplayName(user)}
            email={user.email ?? ""}
            homeHref="/cuidador"
          />
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
