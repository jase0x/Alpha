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
      {/* Skull cranium */}
      <path
        d="M100 16C56 16 28 50 28 90C28 112 36 130 50 142L50 168C50 174 55 178 60 178L80 178L80 158L74 158C70 158 68 154 70 151L76 142C60 132 50 114 50 92C50 60 72 36 100 36C128 36 150 60 150 92C150 114 140 132 124 142L130 151C132 154 130 158 126 158L120 158L120 178L140 178C145 178 150 174 150 168L150 142C164 130 172 112 172 90C172 50 144 16 100 16Z"
        fill={color}
      />
      {/* Left eye socket */}
      <ellipse cx="76" cy="88" rx="16" ry="18" fill="black" />
      {/* Right eye socket */}
      <ellipse cx="124" cy="88" rx="16" ry="18" fill="black" />
      {/* Nose */}
      <path
        d="M94 118L100 108L106 118Q100 124 94 118Z"
        fill="black"
      />
      {/* Teeth */}
      <rect x="72" y="142" width="12" height="16" rx="2" fill={color} stroke="black" strokeWidth="2" />
      <rect x="88" y="142" width="12" height="16" rx="2" fill={color} stroke="black" strokeWidth="2" />
      <rect x="100" y="142" width="12" height="16" rx="2" fill={color} stroke="black" strokeWidth="2" />
      <rect x="116" y="142" width="12" height="16" rx="2" fill={color} stroke="black" strokeWidth="2" />
      {/* Jaw line */}
      <path
        d="M68 142C68 142 72 160 100 160C128 160 132 142 132 142"
        stroke={color}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
