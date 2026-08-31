import { ArrowUpRight, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceProvider } from '../types';
import StarRating from './StarRating';
import TradeIcon from './TradeIcon';

interface ProviderCardProps {
  provider: ServiceProvider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Link to={`/provider/${provider.id}`} className="block no-underline">
      <article className="glass provider-card p-5 cursor-pointer">
        {/* Top row: Category icon + name + distance badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand/15 bg-brand/8 text-brand">
              <TradeIcon category={provider.category_name} className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-charcoal/70">
              {provider.category_name}
            </span>
          </div>
          {provider.distance_km !== undefined && (
            <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
              {provider.distance_km < 1
                ? `${Math.round(provider.distance_meters ?? provider.distance_km * 1000)}m`
                : `${provider.distance_km.toFixed(1)}km`}
            </span>
          )}
        </div>

        {/* Business name */}
        <h3 className="font-display text-xl font-semibold text-ink mb-2">
          {provider.business_name}
        </h3>

        {/* Verified badge */}
        {provider.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf mb-3">
            <ShieldCheck size={13} />
            Verified
          </span>
        )}

        {/* Star rating + review count */}
        <div className="flex items-center gap-2 mt-1 mb-3">
          <StarRating rating={Number(provider.average_rating)} size="sm" />
          <span className="text-sm text-charcoal/75 font-bold">
            {Number(provider.average_rating).toFixed(1)}
          </span>
          <span className="text-sm text-charcoal/45">
            ({provider.review_count} {provider.review_count === 1 ? 'review' : 'reviews'})
          </span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-charcoal/65 text-sm mb-1.5">
          <MapPin size={14} className="text-brand" />
          <span className="truncate">{provider.address}</span>
        </div>

        {/* Phone number — tap/select to copy */}
        <div className="flex items-center gap-2 text-charcoal/65 text-sm mb-3">
          <Phone size={14} className="text-brand" />
          <span className="select-all">{provider.phone}</span>
        </div>

        {/* Description */}
        <p className="text-sm leading-6 text-charcoal/60 line-clamp-2">
          {provider.description}
        </p>
        <div className="mt-4 flex items-center gap-1.5 border-t border-ink/10 pt-3 text-sm font-bold text-brand">
          View profile
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </article>
    </Link>
  );
}
