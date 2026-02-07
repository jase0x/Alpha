'use client';

interface DegenLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function DegenLogo({ size = 32, className = '' }: DegenLogoProps) {
  return (
    <img
      src="https://app.xdex.xyz/assets/degen.png"
      alt="Degen"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
