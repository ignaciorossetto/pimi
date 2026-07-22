"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  name,
  email,
  homeHref,
  fotoUrl,
}: {
  name: string;
  email: string;
  homeHref: string;
  fotoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition hover:bg-foreground/5"
      >
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {initial}
          </span>
        )}
        <span className="hidden sm:inline">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-foreground/10 bg-background py-1 text-foreground shadow-lg">
          <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-foreground/50">{email}</p>
            </div>
          </div>
          <a
            href={`/cuenta?from=${encodeURIComponent(homeHref)}`}
            className="block px-4 py-2 text-sm hover:bg-foreground/5"
          >
            Mis datos y contraseña
          </a>
          <button
            onClick={handleLogout}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-foreground/5"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
