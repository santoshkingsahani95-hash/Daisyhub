import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: number;
  showText?: boolean;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = 14,
  showText = false,
  reviewCount,
  className = '',
}: RatingStarsProps) {
  const roundedRating = Math.max(0, Math.min(maxStars, rating));

  return (
    <div className={`flex items-center gap-1 text-brand-gold ${className}`}>
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.floor(roundedRating) ? 'fill-brand-gold' : 'text-brand-border'}
        />
      ))}
      {showText && (
        <span className="font-bold text-brand-dark ml-1 text-xs">
          {roundedRating.toFixed(1)}
        </span>
      )}
      {typeof reviewCount === 'number' && (
        <span className="text-brand-muted text-xs">({reviewCount})</span>
      )}
    </div>
  );
}
