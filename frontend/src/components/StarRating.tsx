import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export default function StarRating({
  rating,
  maxRating = 5,
  interactive = false,
  onRate,
  size = 'md',
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const displayRating = hoveredRating ?? rating;

  const handleClick = (value: number) => {
    if (interactive && onRate) {
      onRate(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (interactive) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(null);
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${interactive ? 'cursor-pointer' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${rating} out of ${maxRating}`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1;
        const filled = value <= displayRating;

        const star = (
          <Star
            className={`${sizeClasses[size]} transition-colors duration-150 ${filled ? 'fill-clay text-clay' : 'text-charcoal/20'}`}
            aria-hidden="true"
          />
        );

        if (!interactive) {
          return <span key={value}>{star}</span>;
        }

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === displayRating}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-charcoal/35 transition-transform hover:scale-110 focus-visible:outline-brand"
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
          >
            {star}
          </button>
        );
      })}
    </span>
  );
}
