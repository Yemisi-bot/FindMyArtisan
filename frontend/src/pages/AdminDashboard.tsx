import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, Star, CheckCircle, Activity, Shield, AlertTriangle,
  Eye, EyeOff, Ban, RotateCcw, Store, BadgeCheck, Clock3,
  ArrowLeft, Image, MessageSquare, PhoneCall, MapPin, Mail, User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { adminApi, assetUrl } from '../services/api';
import type { AdminStats, AdminLog, AdminUser, ServiceProvider, ProviderDetails } from '../types';
import StarRating from '../components/StarRating';
import TradeIcon from '../components/TradeIcon';

type Tab = 'overview' | 'users' | 'providers' | 'logs';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Provider detail view
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerDetail, setProviderDetail] = useState<ProviderDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openProviderDetail = async (id: string) => {
    setSelectedProviderId(id);
    setDetailLoading(true);
    setActionMessage(null);
    try {
      const res = await adminApi.getProviderDetails(id);
      if (res.data.success && res.data.data) {
        setProviderDetail(res.data.data as ProviderDetails);
      } else {
        setActionMessage({ type: 'error', text: 'Failed to load provider details.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to load provider details.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProviderDetail = () => {
    setSelectedProviderId(null);
    setProviderDetail(null);
  };

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) navigate('/');
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (activeTab === 'overview') {
      setStatsLoading(true);
      adminApi.getStats()
        .then((res) => { if (res.data.success && res.data.data) setStats(res.data.data as AdminStats); })
        .catch(() => setActionMessage({ type: 'error', text: 'Failed to load statistics.' }))
        .finally(() => setStatsLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersLoading(true);
      adminApi.getUsers()
        .then((res) => { if (res.data.success && res.data.data) setUsers(res.data.data as AdminUser[]); })
        .catch(() => setActionMessage({ type: 'error', text: 'Failed to load users.' }))
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'providers') {
      setProvidersLoading(true);
      adminApi.getAllProviders()
        .then((res) => { if (res.data.success && res.data.data) setProviders(res.data.data as ServiceProvider[]); })
        .catch(() => setActionMessage({ type: 'error', text: 'Failed to load providers.' }))
        .finally(() => setProvidersLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
      setLogsLoading(true);
      adminApi.getLogs()
        .then((res) => { if (res.data.success && res.data.data) setLogs(res.data.data as AdminLog[]); })
        .catch(() => setActionMessage({ type: 'error', text: 'Failed to load activity logs.' }))
        .finally(() => setLogsLoading(false));
    }
  }, [activeTab]);

  const handleSuspend = async (id: string, suspended: boolean) => {
    setActionMessage(null);
    setBusyId(id);
    try {
      const res = await adminApi.suspendProvider(id, suspended);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: `Provider ${suspended ? 'suspended' : 'reinstated'} successfully.` });
        setProviders((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, is_suspended: suspended, is_visible: !suspended && p.email_verified && (p.image_count ?? 0) >= (p.images_required ?? 3) } : p
          )
        );
        setConfirmSuspend(null);
      } else {
        setActionMessage({ type: 'error', text: res.data.message || 'Action failed. Please try again.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Action failed. Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated || !isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'providers', label: 'Manage Providers', icon: <Store className="w-4 h-4" /> },
    { key: 'logs', label: 'Activity Logs', icon: <Shield className="w-4 h-4" /> },
  ];

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-brand/10 text-brand',
      provider: 'bg-amber-100 text-amber-700',
      user: 'bg-surface-muted text-charcoal/70',
    };
    return map[role] || map.user;
  };

  // Turn a raw log row into a human-readable sentence using its metadata.
  const describeLog = (log: AdminLog): string => {
    const m = (log.metadata || {}) as Record<string, unknown>;
    switch (log.action) {
      case 'user_registered':
        return `Signed up${m.role === 'provider' ? ' as an artisan' : ''}`;
      case 'email_verified':
        return 'Verified their email address';
      case 'provider_created':
        return `Created business "${m.businessName ?? 'Unknown'}"`;
      case 'review_submitted':
        return `Left a ${m.rating ?? '?'}-star review for ${m.providerName ?? 'a provider'}`;
      case 'suspend_provider':
        return `Suspended "${m.providerName ?? 'a provider'}"`;
      case 'unsuspend_provider':
        return `Reinstated "${m.providerName ?? 'a provider'}"`;
      case 'delete_review':
        return 'Removed a review';
      default:
        return log.action.replace(/_/g, ' ');
    }
  };

  const actionTone = (action: string): string => {
    if (action.startsWith('suspend') || action === 'delete_review') return 'bg-red-100 text-red-700';
    if (action.startsWith('unsuspend') || action === 'provider_created') return 'bg-teal-50 text-leaf';
    if (action === 'review_submitted') return 'bg-brand/10 text-brand';
    return 'bg-surface-muted text-charcoal/70';
  };

  const statCards = stats
    ? [
        { label: 'Total users', value: stats.totalUsers, icon: Users, tone: 'border-clay/20 bg-clay/8', color: 'text-clay' },
        { label: 'Total providers', value: stats.totalProviders, icon: Briefcase, tone: 'border-brand/20 bg-brand/8', color: 'text-brand' },
        { label: 'Live in search', value: stats.liveProviders, icon: Eye, tone: 'border-leaf/20 bg-leaf/8', color: 'text-leaf' },
        { label: 'Suspended', value: stats.suspendedProviders, icon: Ban, tone: 'border-red-200 bg-red-50', color: 'text-red-600' },
        { label: 'Total reviews', value: stats.totalReviews, icon: Star, tone: 'border-brand/20 bg-brand/8', color: 'text-brand' },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 border-b border-ink/10 pb-6 animate-fade-in-up">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-clay">Control room</p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-ink flex items-center gap-3">
          <Shield className="w-7 h-7 text-brand" />
          Admin dashboard
        </h1>
        <p className="text-charcoal/60 mt-2">
          Providers go live automatically. Monitor activity and intervene when needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-8 border-b border-ink/10 animate-fade-in-up">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setActionMessage(null); }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-charcoal/60 hover:text-charcoal hover:bg-surface-muted'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {actionMessage && (
        <div
          className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-teal-50 border border-teal-100 text-leaf'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          {statsLoading ? (
            <div className="flex justify-center py-16"><div className="spinner" /></div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 stagger">
              {statCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="glass p-5 transition-colors hover:border-brand/35">
                    <div className={`flex h-10 w-10 items-center justify-center border ${c.tone}`}>
                      <Icon className={`w-6 h-6 ${c.color}`} />
                    </div>
                    <p className="mt-5 font-display text-3xl font-semibold text-ink">{c.value}</p>
                    <p className="text-sm font-semibold text-charcoal/60 mt-1">{c.label}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16"><p className="text-charcoal/50">Unable to load statistics.</p></div>
          )}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          {usersLoading ? (
            <div className="flex justify-center py-16"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="border border-dashed border-ink/20 bg-surface-muted text-center py-16">
              <Users className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <p className="text-lg font-semibold text-charcoal">No users yet</p>
              <p className="text-charcoal/60 mt-1">Registered accounts will appear here.</p>
            </div>
          ) : (
            <div className="glass rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-surface-muted">
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Name</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Email</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Role</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Email status</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} className={`border-b border-ink/10 hover:bg-surface-muted transition-colors ${idx === users.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                            <div>
                              <p className="font-medium text-charcoal">{u.full_name}</p>
                              {u.phone && <p className="text-xs text-charcoal/50">{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-charcoal/70">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${roleBadge(u.role)}`}>
                            {u.role}
                            {u.has_business && u.role === 'provider' && <Store className="w-3 h-3" />}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.email_verified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-leaf"><BadgeCheck className="w-3.5 h-3.5" /> Verified</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Clock3 className="w-3.5 h-3.5" /> Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-charcoal/50 text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROVIDERS */}
      {activeTab === 'providers' && (
        <div className="animate-fade-in">
          {/* Detail view */}
          {selectedProviderId ? (
            detailLoading ? (
              <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : providerDetail ? (
              <div className="space-y-6">
                {/* Back button */}
                <button
                  onClick={closeProviderDetail}
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to provider list
                </button>

                {/* Provider header card */}
                <div className="glass rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="flex h-9 w-9 items-center justify-center bg-brand/8 text-brand"><TradeIcon category={providerDetail.category_name} className="h-4 w-4" /></span>
                        <h2 className="font-display text-2xl font-semibold text-ink">{providerDetail.business_name}</h2>
                        {providerDetail.is_suspended ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><EyeOff className="w-3 h-3" /> Suspended</span>
                        ) : providerDetail.is_visible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> Live</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Incomplete</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-clay mb-2">{providerDetail.category_name}</p>
                      <div className="text-sm text-charcoal/60 space-y-1">
                        <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {providerDetail.provider_name || 'Unknown'}</div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {providerDetail.provider_email || 'No email'}</div>
                        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {providerDetail.address || 'No address'}</div>
                        <div className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> {providerDetail.phone || 'No phone'}</div>
                        <p className="text-xs text-charcoal/40 mt-1">
                          {providerDetail.email_verified ? 'Email verified' : 'Email not verified'} ·{' '}
                          {providerDetail.image_count}/{providerDetail.images_required} photos · Rating: {Number(providerDetail.average_rating).toFixed(1)} ({providerDetail.review_count} reviews) · Joined {formatDate(providerDetail.created_at)}
                        </p>
                      </div>
                      {providerDetail.description && (
                        <p className="text-sm text-charcoal/70 mt-3 italic">"{providerDetail.description}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {providerDetail.is_suspended ? (
                        <button onClick={() => handleSuspend(providerDetail.id, false)} disabled={busyId === providerDetail.id} className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-60">
                          <RotateCcw className="w-4 h-4" /> Reinstate
                        </button>
                      ) : confirmSuspend === providerDetail.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSuspend(providerDetail.id, true)} disabled={busyId === providerDetail.id} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#b91c1c] hover:bg-red-700 disabled:opacity-60">
                            <Ban className="w-4 h-4" /> Confirm
                          </button>
                          <button onClick={() => setConfirmSuspend(null)} className="btn-glass text-sm px-4 py-2">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmSuspend(providerDetail.id)} className="btn-glass inline-flex items-center gap-1.5 text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50">
                          <Ban className="w-4 h-4" /> Suspend
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Work Images */}
                <div className="glass rounded-lg p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <Image className="w-5 h-5 text-brand" /> Work photos ({providerDetail.work_images.length})
                  </h3>
                  {providerDetail.work_images.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No work photos uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {providerDetail.work_images.map((img) => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-ink/10 bg-surface-muted aspect-square">
                          <img src={assetUrl(img.image_url)} alt={img.caption || 'Work photo'} className="w-full h-full object-cover" />
                          {img.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1 truncate">{img.caption}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div className="glass rounded-lg p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-brand" /> Reviews ({providerDetail.reviews.length})
                  </h3>
                  {providerDetail.reviews.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No reviews yet.</p>
                  ) : (
                    <div className="divide-y divide-ink/10">
                      {providerDetail.reviews.map((rev) => (
                        <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                                  {rev.reviewer_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                                <span className="font-medium text-charcoal text-sm">{rev.reviewer_name}</span>
                                <span className="text-xs text-charcoal/40">{rev.reviewer_email}</span>
                              </div>
                              <div className="flex items-center gap-1 mb-1">
                                <StarRating rating={rev.rating} size="sm" />
                                <span className="text-xs text-charcoal/50 ml-1">{formatDate(rev.created_at)}</span>
                              </div>
                              {rev.comment && <p className="text-sm text-charcoal/70">{rev.comment}</p>}
                            </div>
                            {rev.image_url && (
                              <img src={assetUrl(rev.image_url)} alt="Review proof" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contacts (who revealed the number) */}
                <div className="glass rounded-lg p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <PhoneCall className="w-5 h-5 text-brand" /> People who contacted ({providerDetail.contacts.length})
                  </h3>
                  {providerDetail.contacts.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No one has viewed this artisan's phone number yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-ink/10">
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">User</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">Email</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">Phone</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerDetail.contacts.map((c, idx) => (
                            <tr key={c.id} className={`border-b border-ink/10 hover:bg-surface-muted transition-colors ${idx === providerDetail.contacts.length - 1 ? 'border-b-0' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                                    {c.user_name?.charAt(0).toUpperCase() || '?'}
                                  </span>
                                  <span className="font-medium text-charcoal">{c.user_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-charcoal/70">{c.user_email}</td>
                              <td className="px-4 py-3 text-charcoal/50">{c.user_phone || '—'}</td>
                              <td className="px-4 py-3 text-charcoal/50 text-xs whitespace-nowrap">{formatDate(c.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null
          ) : (
            /* Provider list view */
            providersLoading ? (
              <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : providers.length === 0 ? (
              <div className="border border-dashed border-ink/20 bg-surface-muted text-center py-16">
                <Store className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
                <p className="text-lg font-semibold text-charcoal">No providers yet</p>
                <p className="text-charcoal/60 mt-1">Registered artisans will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 stagger">
                {providers.map((provider) => {
                  const suspended = !!provider.is_suspended;
                  const visible = !!provider.is_visible;
                  return (
                    <div
                      key={provider.id}
                      onClick={() => openProviderDetail(provider.id)}
                      className="glass p-6 transition-colors cursor-pointer hover:border-brand/50 hover:shadow-[0_12px_24px_rgba(21,50,58,0.1)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="flex h-8 w-8 items-center justify-center bg-brand/8 text-brand"><TradeIcon category={provider.category_name} className="h-4 w-4" /></span>
                            <h3 className="font-display text-xl font-semibold text-ink">{provider.business_name}</h3>
                            {suspended ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                <EyeOff className="w-3 h-3" /> Suspended
                              </span>
                            ) : visible ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                <Eye className="w-3 h-3" /> Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Incomplete
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-clay mb-2">{provider.category_name}</p>
                          <div className="text-sm text-charcoal/60 space-y-0.5">
                            {provider.provider_name && <p>{provider.provider_name} · {provider.provider_email}</p>}
                            {provider.address && <p>{provider.address}</p>}
                            {provider.phone && <p>{provider.phone}</p>}
                            <p className="text-xs text-charcoal/40 mt-1">
                              {provider.email_verified ? 'Email verified' : 'Email not verified'} ·{' '}
                              {provider.image_count ?? 0}/{provider.images_required ?? 3} photos · Joined {formatDate(provider.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {suspended ? (
                            <button
                              onClick={() => handleSuspend(provider.id, false)}
                              disabled={busyId === provider.id}
                              className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-60"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Reinstate
                            </button>
                          ) : confirmSuspend === provider.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSuspend(provider.id, true)}
                                disabled={busyId === provider.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#b91c1c] hover:bg-red-700 disabled:opacity-60"
                              >
                                <Ban className="w-4 h-4" />
                                Confirm
                              </button>
                              <button onClick={() => setConfirmSuspend(null)} className="btn-glass text-sm px-4 py-2">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmSuspend(provider.id)}
                              className="btn-glass inline-flex items-center gap-1.5 text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Ban className="w-4 h-4" />
                              Suspend
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* LOGS */}
      {activeTab === 'logs' && (
        <div className="animate-fade-in">
          {logsLoading ? (
            <div className="flex justify-center py-16"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="border border-dashed border-ink/20 bg-surface-muted text-center py-16">
              <Activity className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <p className="text-lg font-semibold text-charcoal">No activity yet</p>
              <p className="text-charcoal/60 mt-1">Signups, new businesses, reviews and moderation will appear here.</p>
            </div>
          ) : (
            <div className="glass rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-surface-muted">
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Who</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Activity</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Type</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={log.id} className={`border-b border-ink/10 transition-colors hover:bg-surface-muted ${idx === logs.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {log.admin_name?.charAt(0).toUpperCase() || 'S'}
                            </span>
                            <span className="text-charcoal font-medium whitespace-nowrap">{log.admin_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${actionTone(log.action)}`}>
                            {describeLog(log)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-charcoal/60 capitalize">{log.target_type}</td>
                        <td className="px-6 py-4 text-charcoal/50 text-xs whitespace-nowrap">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
