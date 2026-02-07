'use client';

interface SolanaLogoProps {
  size?: number;
  className?: string;
}

export default function SolanaLogo({ size = 20, className = '' }: SolanaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sol-grad-1" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00D1FF" />
        </linearGradient>
        <linearGradient id="sol-grad-2" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00D1FF" />
        </linearGradient>
        <linearGradient id="sol-grad-3" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00D1FF" />
        </linearGradient>
      </defs>
      {/* Top bar */}
      <path
        d="M16 28L74 28L84 18L26 18Z"
        fill="url(#sol-grad-1)"
      />
      {/* Middle bar */}
      <path
        d="M16 56L74 56L84 46L26 46Z"
        fill="url(#sol-grad-2)"
      />
      {/* Bottom bar */}
      <path
        d="M16 84L74 84L84 74L26 74Z"
        fill="url(#sol-grad-3)"
      />
    </svg>
  );
}
