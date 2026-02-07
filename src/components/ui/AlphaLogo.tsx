'use client';

interface AlphaLogoProps {
  size?: number;
  className?: string;
  collapsed?: boolean;
}

export default function AlphaLogo({ size = 30, className = '', collapsed = false }: AlphaLogoProps) {
  if (collapsed) {
    return <img src="https://app.xdex.xyz/logo/logo.png" alt="XDEX" style={{ width: size, height: size }} className="object-contain" />;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`} style={{ height: size }}>
      <img src="https://app.xdex.xyz/logo/logo.png" alt="XDEX" style={{ width: Math.round(size * 0.7), height: Math.round(size * 0.7) }} className="object-contain" />
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
