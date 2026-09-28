'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface ImageWithSkeletonProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  skeletonClassName?: string;
  fallbackSrc?: string;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  fallbackSrc = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  return (
    <div className="relative w-full h-full overflow-hidden bg-stone-100 dark:bg-stone-800">
      {/* Skeleton Pulse Loading Shimmer */}
      {isLoading && (
        <div
          className={`absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-stone-200 via-stone-300 to-stone-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 ${skeletonClassName}`}
        >
          <div className="w-full h-full bg-stone-200/40 dark:bg-stone-700/40 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Image Element with Smooth Fade-in */}
      <Image
        {...props}
        src={imgSrc}
        alt={alt || 'Product Image'}
        unoptimized
        className={`transition-opacity duration-500 ease-in-out ${
          isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(fallbackSrc);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

export default ImageWithSkeleton;
