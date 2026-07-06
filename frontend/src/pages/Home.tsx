import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Store, Shield, Clock, ArrowRight, MapPin, Eye, EyeOff, Sparkles,
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
      accent: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-600',
    },
    ...(isProvider
      ? [{
          to: '/my-business',
          icon: Store,
          title: 'My Business',
          desc: 'Manage your profile, work catalog and reviews.',
          accent: 'from-teal-500/20 to-teal-600/10',
          iconColor: 'text-teal-600',
        }]
      : isAdmin
      ? [{
          to: '/admin',
          icon: Shield,
          title: 'Admin Dashboard',
          desc: 'Moderate providers and review platform activity.',
          accent: 'from-teal-500/20 to-teal-600/10',
          iconColor: 'text-teal-600',
        }]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Greeting */}
      <div className="glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-300/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 glass-light px-3 py-1.5 rounded-full text-xs font-medium text-charcoal/70 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            {isAdmin ? 'Administrator' : isProvider ? 'Artisan account' : 'Welcome back'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-charcoal/60 mt-2 max-w-xl">
            {isProvider
              ? 'Here’s a quick look at your business and where to go next.'
              : 'What do you need done today? Find a trusted local artisan in minutes.'}
          </p>
        </div>
      </div>

      {/* Provider business status */}
      {isProvider && profile && (
        <Link
          to="/my-business"
          className="glass rounded-2xl p-6 mb-6 flex items-center justify-between gap-4 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{profile.category_icon}</span>
            <div>
              <p className="font-bold text-charcoal">{profile.business_name}</p>
              <div className="flex items-center gap-1.5 text-sm mt-0.5">
                {profile.visibility.is_suspended ? (
                  <><EyeOff className="w-4 h-4 text-red-500" /><span className="text-red-600">Suspended</span></>
                ) : profile.visibility.is_visible ? (
                  <><Eye className="w-4 h-4 text-green-600" /><span className="text-green-700">Visible to customers</span></>
                ) : (
                  <><EyeOff className="w-4 h-4 text-amber-600" /><span className="text-amber-700">Not visible yet</span></>
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
              className="glass rounded-2xl p-6 group transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.accent} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${a.iconColor}`} />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-charcoal">{a.title}</h2>
                <ArrowRight className="w-5 h-5 text-charcoal/30 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-charcoal/60 text-sm mt-1">{a.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-charcoal">Recent searches</h2>
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
                  className="glass-light px-4 py-2 rounded-full text-sm font-medium text-charcoal/80 hover:text-charcoal inline-flex items-center gap-1.5 capitalize transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
