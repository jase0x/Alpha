'use client';

interface DegenLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function DegenLogo({ size = 32, className = '', color = '#ffffff' }: DegenLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left eye */}
      <circle cx="68" cy="78" r="24" fill={color} />
      {/* Right eye */}
      <circle cx="132" cy="78" r="24" fill={color} />
      {/* Chart arrow from left eye going up-right */}
      <path
        d="M68 78 L90 56 L102 66 L130 34"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M120 30 L132 34 L128 46"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Nose - heart/spade shape */}
      <path
        d="M100 112 L90 124 Q100 134 110 124 Z"
        fill={color}
      />
      {/* Teeth/candlesticks */}
      {/* Candle 1 */}
      <rect x="68" y="150" width="10" height="30" rx="1" fill={color} />
      <rect x="71" y="145" width="4" height="40" rx="1" fill={color} />
      {/* Candle 2 */}
      <rect x="86" y="155" width="10" height="24" rx="1" fill={color} />
      <rect x="89" y="148" width="4" height="36" rx="1" fill={color} />
      {/* Candle 3 */}
      <rect x="104" y="148" width="10" height="28" rx="1" fill={color} />
      <rect x="107" y="142" width="4" height="40" rx="1" fill={color} />
      {/* Candle 4 */}
      <rect x="122" y="153" width="10" height="26" rx="1" fill={color} />
      <rect x="125" y="146" width="4" height="38" rx="1" fill={color} />
    </svg>
  );
}
