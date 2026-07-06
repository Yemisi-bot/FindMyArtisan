import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
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
      className={`inline-flex gap-1 ${interactive ? 'cursor-pointer' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${rating} out of ${maxRating}`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1;
        const filled = value <= displayRating;

        return (
          <span
            key={value}
            role={interactive ? 'radio' : undefined}
            aria-checked={interactive ? value === displayRating : undefined}
            aria-label={interactive ? `${value} star${value > 1 ? 's' : ''}` : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(value);
                    }
                  }
                : undefined
            }
            className={`${sizeClasses[size]} transition-all duration-200 ${
              filled
                ? 'text-amber-500'
                : 'text-gray-300'
            } ${
              interactive
                ? 'hover:text-amber-400 hover:scale-110 cursor-pointer'
                : ''
            }`}
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
          >
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}
