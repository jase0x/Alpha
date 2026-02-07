'use client';

interface AlphaLogoProps {
  size?: number;
  className?: string;
  collapsed?: boolean;
}

// XDEX hexagon X logo mark
function XdexHexLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <linearGradient id="xdex-logo" x1="50" y1="0" x2="150" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#0566ea" />
        </linearGradient>
      </defs>
      {/* Hexagon outline */}
      <path
        d="M100 10 L180 55 L180 145 L100 190 L20 145 L20 55 Z"
        stroke="url(#xdex-logo)"
        strokeWidth="14"
        fill="none"
        strokeLinejoin="round"
      />
      {/* X inside hexagon */}
      <path
        d="M62 65 L82 100 L62 135 H80 L100 108 L120 135 H138 L118 100 L138 65 H120 L100 92 L80 65 Z"
        fill="url(#xdex-logo)"
      />
    </svg>
  );
}

export default function AlphaLogo({ size = 30, className = '', collapsed = false }: AlphaLogoProps) {
  if (collapsed) {
    return <XdexHexLogo size={size} />;
  }

  // Full logo: XDEX hex logo + "XDEX" + "Alpha Scan"
  return (
    <div className={`flex items-center gap-1.5 ${className}`} style={{ height: size }}>
      <XdexHexLogo size={Math.round(size * 0.7)} />
      <span
        style={{ fontSize: size * 0.45, lineHeight: 1 }}
        className="font-bold text-white tracking-tight"
      >
        XDEX
      </span>
      <span
        style={{ fontSize: size * 0.35, lineHeight: 1 }}
        className="text-xdex-text-muted font-normal"
      >
        Alpha Scan
      </span>
    </div>
  );
}
