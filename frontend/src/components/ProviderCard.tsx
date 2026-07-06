import { MapPin, Phone, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceProvider } from '../types';

interface ProviderCardProps {
  provider: ServiceProvider;
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="star-rating" style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rounded ? 'filled' : ''}`}
          style={{ color: star <= rounded ? '#f59e0b' : '#d1d5db', fontSize: '1.1rem' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Link to={`/provider/${provider.id}`} className="block no-underline">
      <div className="glass provider-card p-5 cursor-pointer">
        {/* Top row: Category icon + name + distance badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{provider.category_icon}</span>
            <span className="text-sm font-medium text-gray-700">
              {provider.category_name}
            </span>
          </div>
          {provider.distance_km !== undefined && (
            <span
              className="distance-badge text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#b45309',
              }}
            >
              {provider.distance_km < 1
                ? `${Math.round(provider.distance_meters ?? provider.distance_km * 1000)}m`
                : `${provider.distance_km.toFixed(1)}km`}
            </span>
          )}
        </div>

        {/* Business name */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {provider.business_name}
        </h3>

        {/* Verified badge */}
        {provider.is_verified && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold mb-2"
            style={{ backgroundColor: '#0d9488', color: 'white' }}
          >
            <Shield size={12} />
            Verified
          </span>
        )}

        {/* Star rating + review count */}
        <div className="flex items-center gap-2 mt-1 mb-2">
          <StarRating rating={Number(provider.average_rating)} />
          <span className="text-sm text-gray-600 font-medium">
            {Number(provider.average_rating).toFixed(1)}
          </span>
          <span className="text-sm text-gray-400">
            ({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})
          </span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-gray-600 text-sm mb-1.5">
          <MapPin size={14} />
          <span className="truncate">{provider.address}</span>
        </div>

        {/* Phone number — tap/select to copy */}
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
          <Phone size={14} />
          <span className="select-all">{provider.phone}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 line-clamp-2">
          {provider.description}
        </p>
      </div>
    </Link>
  );
}
