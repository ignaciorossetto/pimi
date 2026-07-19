import { PawIcon } from "@/components/icons";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-6 py-6">
        <a href="/" className="mx-auto flex w-fit items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <PawIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight">Pimi</span>
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
