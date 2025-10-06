import React from "react";
import Image from "next/image";

interface CustomerLogoProps {
  logoUrl: string | null;
  customerName: string;
  size?: number;
  className?: string;
}

export default function CustomerLogo({
  logoUrl,
  customerName,
  size = 48,
  className = "",
}: CustomerLogoProps) {
  const containerClasses = `w-${size} h-${size} rounded-full overflow-hidden border border-gray-200 flex-shrink-0 ${className}`;

  if (logoUrl) {
    return (
      <div className={containerClasses}>
        <Image
          src={logoUrl}
          alt={`${customerName} logo`}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
        {customerName.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}
