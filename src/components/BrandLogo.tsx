import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 44, className = '' }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-[24%] shadow-sm transition-transform hover:scale-105 ${className}`}
      aria-label="ShuttleScore Logo"
    >
      {/* Court Emerald / Lime Mint Squircle */}
      <rect width="512" height="512" rx="124" fill="#6ee7b7" />
      {/* Shuttlecock silhouette in clean monoline */}
      <path
        d="M 180 180 L 332 180 L 290 310 L 222 310 Z"
        fill="none"
        stroke="#064e3b"
        strokeWidth="36"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="256" cy="340" r="28" fill="#064e3b" />
    </svg>
  );
}

export default BrandLogo;
