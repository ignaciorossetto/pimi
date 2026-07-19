// Ilustración propia del hero: perro y gato + valija (tema "viaje + mascota
// cuidada"). Vectorial a mano, sin assets externos ni licencias de por medio.
export function PetIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 420 380" fill="none" {...props}>
      <circle cx="210" cy="190" r="180" fill="var(--surface)" />

      {/* sombra piso */}
      <ellipse cx="210" cy="330" rx="120" ry="14" fill="#00000010" />

      {/* valija */}
      <g>
        <rect
          x="150"
          y="235"
          width="120"
          height="85"
          rx="10"
          fill="var(--brand)"
        />
        <rect
          x="150"
          y="235"
          width="120"
          height="22"
          rx="10"
          fill="var(--brand-dark)"
        />
        <rect
          x="192"
          y="216"
          width="36"
          height="20"
          rx="6"
          fill="none"
          stroke="var(--brand-dark)"
          strokeWidth="6"
        />
        <path
          d="M150 285h120"
          stroke="#ffffff55"
          strokeWidth="3"
        />
      </g>

      {/* gato (izquierda) */}
      <g>
        <ellipse cx="118" cy="245" rx="34" ry="38" fill="#3a3a3a" />
        <path d="M92 218 82 190l24 18Z" fill="#3a3a3a" />
        <path d="M144 218l10-28-24 18Z" fill="#3a3a3a" />
        <circle cx="106" cy="238" r="4" fill="#fff" />
        <circle cx="130" cy="238" r="4" fill="#fff" />
        <circle cx="106" cy="239" r="1.8" fill="#222" />
        <circle cx="130" cy="239" r="1.8" fill="#222" />
        <path
          d="M112 250q6 5 12 0"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M70 240h20M70 248h18M148 240h-20M150 248h-18"
          stroke="#00000055"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* perro (derecha) */}
      <g>
        <ellipse cx="305" cy="240" rx="40" ry="44" fill="#c98a4b" />
        <ellipse cx="278" cy="212" rx="13" ry="20" fill="#a5672c" transform="rotate(-20 278 212)" />
        <ellipse cx="332" cy="212" rx="13" ry="20" fill="#a5672c" transform="rotate(20 332 212)" />
        <ellipse cx="305" cy="252" rx="18" ry="14" fill="#f2d9b8" />
        <circle cx="292" cy="232" r="4.2" fill="#2b1a10" />
        <circle cx="318" cy="232" r="4.2" fill="#2b1a10" />
        <ellipse cx="305" cy="248" rx="5" ry="3.6" fill="#2b1a10" />
        <path
          d="M296 258q9 7 18 0"
          stroke="#2b1a10"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="m305 252-1 6"
          stroke="#2b1a10"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* huellitas flotando */}
      <g fill="var(--accent)" opacity="0.55">
        <circle cx="60" cy="120" r="4" />
        <circle cx="72" cy="106" r="2.6" />
        <circle cx="80" cy="122" r="2.6" />
        <circle cx="350" cy="100" r="4" />
        <circle cx="362" cy="86" r="2.6" />
        <circle cx="370" cy="102" r="2.6" />
      </g>
    </svg>
  );
}
