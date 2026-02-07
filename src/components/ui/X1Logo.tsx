'use client';

interface X1LogoProps {
  size?: number;
  className?: string;
}

export default function X1Logo({ size = 20, className = '' }: X1LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* X character */}
      <path
        d="M18 22L38 50L18 78H30L44 58L58 78H70L50 50L70 22H58L44 42L30 22H18Z"
        fill="white"
      />
      {/* 1 character - blue gradient */}
      <defs>
        <linearGradient id="x1-blue" x1="68" y1="22" x2="88" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#0566ea" />
        </linearGradient>
      </defs>
      <path
        d="M72 22L68 32H76V72H68V78H92V72H84V22H72Z"
        fill="url(#x1-blue)"
      />
    </svg>
  );
}
