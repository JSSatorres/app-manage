"use client";

import Image from "next/image";

interface AppImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function AppImage({
  src,
  alt,
  width = 100,
  height = 100,
  className,
}: AppImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
