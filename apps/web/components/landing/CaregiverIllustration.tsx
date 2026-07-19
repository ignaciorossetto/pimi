// Ilustración propia: persona cuidando a un perro + moneda (tema "ganás
// dinero cuidando mascotas"). Vectorial a mano, sin assets externos.
export function CaregiverIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 420 380" fill="none" {...props}>
      <circle cx="210" cy="190" r="180" fill="var(--surface)" />
      <ellipse cx="210" cy="330" rx="120" ry="14" fill="#00000010" />

      {/* persona */}
      <g>
        <circle cx="160" cy="150" r="30" fill="var(--accent)" />
        <path
          d="M110 262c0-40 22-66 50-66s50 26 50 66"
          fill="var(--accent)"
        />
      </g>

      {/* mano acariciando */}
      <path
        d="M196 214q18-10 36 0"
        stroke="var(--accent)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {/* perro */}
      <g>
        <ellipse cx="272" cy="256" rx="42" ry="36" fill="#c98a4b" />
        <ellipse
          cx="247"
          cy="229"
          rx="12"
          ry="18"
          fill="#a5672c"
          transform="rotate(-15 247 229)"
        />
        <ellipse
          cx="294"
          cy="231"
          rx="12"
          ry="18"
          fill="#a5672c"
          transform="rotate(18 294 231)"
        />
        <circle cx="260" cy="251" r="4" fill="#2b1a10" />
        <circle cx="284" cy="251" r="4" fill="#2b1a10" />
        <ellipse cx="272" cy="265" rx="5" ry="3.4" fill="#2b1a10" />
        <path
          d="M262 271q10 7 20 0"
          stroke="#2b1a10"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* moneda */}
      <g>
        <circle cx="335" cy="140" r="24" fill="var(--brand)" />
        <text
          x="335"
          y="148"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#ffffff"
        >
          $
        </text>
      </g>

      {/* corazón */}
      <path
        d="M88 118c-6-10-20-8-22 4-2 10 8 18 22 26 14-8 24-16 22-26-2-12-16-14-22-4Z"
        fill="var(--brand)"
        opacity="0.7"
      />
    </svg>
  );
}
