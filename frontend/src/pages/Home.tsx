import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Store, Shield, Clock, ArrowRight, MapPin, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { providersApi } from '../services/api';

interface RecentSearch {
  id: string;
  category_slug?: string | null;
  search_term?: string | null;
  created_at: string;
}

interface MiniProfile {
  business_name: string;
  category_icon: string;
  visibility: { is_visible: boolean; is_suspended: boolean };
}

/**
 * The signed-in landing experience — distinct from the public marketing page.
 * Greets the user, surfaces role-aware quick actions, their business status
 * (for artisans) and recent searches.
 */
export default function Home() {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [profile, setProfile] = useState<MiniProfile | null>(null);

  useEffect(() => {
    providersApi
      .getRecentSearches()
      .then((res) => {
        if (res.data.success && res.data.data) setRecent((res.data.data as RecentSearch[]).slice(0, 6));
      })
      .catch(() => undefined);

    if (isProvider) {
      providersApi
        .getMyProfile()
        .then((res) => {
          if (res.data.success && res.data.data) setProfile(res.data.data as MiniProfile);
        })
        .catch(() => undefined);
    }
  }, [isProvider]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const actions = [
    {
      to: '/discover',
      icon: Search,
      title: 'Find Services',
      desc: 'Browse trusted artisans near you on the map.',
      tone: 'border-brand/20 bg-brand/8',
      iconColor: 'text-brand',
    },
    ...(isProvider
      ? [{
          to: '/my-business',
          icon: Store,
          title: 'My Business',
          desc: 'Manage your profile, work catalog and reviews.',
          tone: 'border-clay/20 bg-clay/8',
          iconColor: 'text-clay',
        }]
      : isAdmin
      ? [{
          to: '/admin',
          icon: Shield,
          title: 'Admin Dashboard',
          desc: 'Moderate providers and review platform activity.',
          tone: 'border-clay/20 bg-clay/8',
          iconColor: 'text-clay',
        }]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Greeting */}
      <div className="mb-7 border-b border-ink/10 pb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">
          {isAdmin ? 'Administrator' : isProvider ? 'Artisan account' : 'Your local directory'}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-ink sm:text-4xl">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-2 max-w-xl text-charcoal/65">
          {isProvider
            ? 'Manage your business, add recent work, and keep an eye on customer feedback.'
            : 'Find a trusted local artisan and compare their work before you call.'}
        </p>
      </div>

      {/* Provider business status */}
      {isProvider && profile && (
        <Link
          to="/my-business"
          className="glass p-5 mb-6 flex items-center justify-between gap-4 transition-colors hover:border-brand/45 hover:shadow-[0_10px_22px_rgba(21,50,58,0.09)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand/15 bg-brand/8 text-brand">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ink">{profile.business_name}</p>
              <div className="flex items-center gap-1.5 text-sm mt-0.5">
                {profile.visibility.is_suspended ? (
                  <><EyeOff className="w-4 h-4 text-red-500" /><span className="text-red-600">Suspended</span></>
                ) : profile.visibility.is_visible ? (
                  <><Eye className="w-4 h-4 text-leaf" /><span className="text-leaf">Visible to customers</span></>
                ) : (
                  <><EyeOff className="w-4 h-4 text-clay" /><span className="text-amber-700">Not visible yet</span></>
                )}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-charcoal/40" />
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="glass p-6 group transition-colors hover:border-brand/45 hover:shadow-[0_12px_24px_rgba(21,50,58,0.1)]"
            >
              <div className={`flex h-11 w-11 items-center justify-center border ${a.tone}`}>
                <Icon className={`w-6 h-6 ${a.iconColor}`} />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="mt-5 font-display text-xl font-semibold text-ink">{a.title}</h2>
                <ArrowRight className="mt-5 w-5 h-5 text-charcoal/30 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-charcoal/60 text-sm leading-6 mt-1">{a.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <section className="glass p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-brand" />
            <h2 className="font-display text-xl font-semibold text-ink">Recent searches</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {recent.map((r) => {
              const label = r.search_term || r.category_slug?.replace(/-/g, ' ') || 'Search';
              const params = new URLSearchParams();
              if (r.category_slug) params.set('category', r.category_slug);
              if (r.search_term) params.set('q', r.search_term);
              return (
                <Link
                  key={r.id}
                  to={`/discover?${params.toString()}`}
                  className="rounded-full border border-ink/10 bg-surface px-4 py-2 text-sm font-semibold text-charcoal/80 hover:border-brand/40 hover:text-brand inline-flex items-center gap-1.5 capitalize transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand" />
                  {label}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
