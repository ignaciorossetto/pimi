// Set de íconos propio (SVG a mano, sin dependencias externas).
// Estilo consistente: trazo 1.8, 24x24, currentColor.

type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PawIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="8.5" r="1.6" />
      <circle cx="12" cy="6.5" r="1.6" />
      <circle cx="17" cy="8.5" r="1.6" />
      <path d="M12 12.5c-3 0-5.5 2-5.5 4.3 0 1.7 1.5 2.7 3.2 2.2.8-.3 1.5-.3 2.3 0 1.7.5 3.2-.5 3.2-2.2 0-2.3-2.5-4.3-5.2-4.3Z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
      <path d="m8.5 14.5 2 2 4.5-4.5" />
    </svg>
  );
}

export function HomeHeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
      <path d="M12 17.2s-2.6-1.6-2.6-3.4a1.6 1.6 0 0 1 2.6-1.2 1.6 1.6 0 0 1 2.6 1.2c0 1.8-2.6 3.4-2.6 3.4Z" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...props}>
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.4l-5.9 3.1 1.3-6.5-4.9-4.6 6.6-.8Z" />
    </svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v6c0 4.6 3 7.9 7 8.5 4-.6 7-3.9 7-8.5V6Z" />
      <path d="m9 12 2 2 4-4.2" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20.2s-7.2-4.4-9.4-8.7C1.2 8.6 2.6 5.3 5.8 4.6c1.9-.4 3.7.4 4.7 2 .3.5 1.3.5 1.6 0 1-1.6 2.8-2.4 4.7-2 3.2.7 4.6 4 3.2 6.9-2.2 4.3-9.4 8.7-9.4 8.7Z" />
    </svg>
  );
}

export function SuitcaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V5.8a1.3 1.3 0 0 1 1.3-1.3h4.4a1.3 1.3 0 0 1 1.3 1.3V7.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </svg>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v8.4M9.7 15c0 1 1 1.8 2.3 1.8s2.3-.7 2.3-1.7c0-1.1-.9-1.5-2.3-1.9-1.4-.4-2.3-.9-2.3-1.9 0-1 1-1.7 2.3-1.7s2.3.7 2.3 1.7" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S5.8 5.5 12 5.5 21.5 12 21.5 12 18.2 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.7c.4-.1.9-.2 1.4-.2 6.2 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.4 4.2M6.8 7.2A14.9 14.9 0 0 0 2.5 12S5.8 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

// Logo oficial de Google ("G" de 4 colores). A diferencia del resto del
// set, no sigue el estilo "trazo a mano / currentColor" — Google pide
// mantener sus colores de marca tal cual en los botones "Sign in with
// Google", así que este ícono queda con los colores fijos.
export function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
