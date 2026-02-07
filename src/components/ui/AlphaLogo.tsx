'use client';

interface AlphaLogoProps {
  size?: number;
  className?: string;
  collapsed?: boolean;
}

export default function AlphaLogo({ size = 30, className = '', collapsed = false }: AlphaLogoProps) {
  if (collapsed) {
    // Show just "A" in a stylized way when sidebar is collapsed
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <text
          x="20"
          y="30"
          textAnchor="middle"
          fill="white"
          fontSize="30"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          A
        </text>
      </svg>
    );
  }

  // Full logo: "Alpha" in white + "by" in grey + XDEX logo mark
  const scale = size / 30;
  return (
    <div className={`flex items-center gap-1.5 ${className}`} style={{ height: size }}>
      <span
        style={{ fontSize: size * 0.65, lineHeight: 1 }}
        className="font-extrabold text-white tracking-tight"
      >
        Alpha
      </span>
      <span
        style={{ fontSize: size * 0.35, lineHeight: 1 }}
        className="text-xdex-text-muted font-normal"
      >
        by
      </span>
      {/* XDEX logo mark */}
      <svg
        width={size * 1.6}
        height={size * 0.55}
        viewBox="0 0 160 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="xdex-grad" x1="0" y1="0" x2="160" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#0566ea" />
          </linearGradient>
        </defs>
        <text
          x="0"
          y="40"
          fill="url(#xdex-grad)"
          fontSize="44"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-1"
        >
          XDEX
        </text>
      </svg>
    </div>
  );
}
