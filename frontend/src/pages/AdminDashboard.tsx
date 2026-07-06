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
      admin: 'bg-teal-100 text-teal-700',
      provider: 'bg-amber-100 text-amber-700',
      user: 'bg-charcoal/10 text-charcoal/70',
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
        return `Left a ${m.rating ?? '?'}★ review for ${m.providerName ?? 'a provider'}`;
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
    if (action.startsWith('unsuspend') || action === 'provider_created') return 'bg-green-100 text-green-700';
    if (action === 'review_submitted') return 'bg-purple-100 text-purple-700';
    return 'bg-charcoal/10 text-charcoal/70';
  };

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, accent: 'from-amber-500/20 to-amber-600/10', color: 'text-amber-600' },
        { label: 'Total Providers', value: stats.totalProviders, icon: Briefcase, accent: 'from-teal-500/20 to-teal-600/10', color: 'text-teal-600' },
        { label: 'Live in Search', value: stats.liveProviders, icon: Eye, accent: 'from-green-500/20 to-green-600/10', color: 'text-green-600' },
        { label: 'Suspended', value: stats.suspendedProviders, icon: Ban, accent: 'from-red-500/20 to-red-600/10', color: 'text-red-500' },
        { label: 'Total Reviews', value: stats.totalReviews, icon: Star, accent: 'from-purple-500/20 to-purple-600/10', color: 'text-purple-500' },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-charcoal flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-500" />
          Admin Dashboard
        </h1>
        <p className="text-charcoal/60 mt-1">
          Providers go live automatically — use this panel to monitor and suspend if needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 animate-fade-in-up">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setActionMessage(null); }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'glass text-charcoal/70 hover:text-charcoal hover:bg-white/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {actionMessage && (
        <div
          className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
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
                  <div key={c.label} className="glass rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${c.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-charcoal">{c.value}</p>
                    <p className="text-sm text-charcoal/60 mt-1">{c.label}</p>
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
            <div className="text-center py-16 glass rounded-2xl">
              <Users className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <p className="text-lg font-semibold text-charcoal">No users yet</p>
              <p className="text-charcoal/60 mt-1">Registered accounts will appear here.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Name</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Email</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Role</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Email status</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} className={`border-b border-white/10 hover:bg-white/10 transition-colors ${idx === users.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><BadgeCheck className="w-3.5 h-3.5" /> Verified</span>
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
                <div className="glass rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xl">{providerDetail.category_icon}</span>
                        <h2 className="text-2xl font-bold text-charcoal">{providerDetail.business_name}</h2>
                        {providerDetail.is_suspended ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><EyeOff className="w-3 h-3" /> Suspended</span>
                        ) : providerDetail.is_visible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> Live</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Incomplete</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-amber-600 mb-2">{providerDetail.category_name}</p>
                      <div className="text-sm text-charcoal/60 space-y-1">
                        <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {providerDetail.provider_name || 'Unknown'}</div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {providerDetail.provider_email || 'No email'}</div>
                        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {providerDetail.address || 'No address'}</div>
                        <div className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> {providerDetail.phone || 'No phone'}</div>
                        <p className="text-xs text-charcoal/40 mt-1">
                          {providerDetail.email_verified ? 'Email verified' : 'Email not verified'} ·{' '}
                          {providerDetail.image_count}/{providerDetail.images_required} photos · Rating: {Number(providerDetail.average_rating).toFixed(1)}★ ({providerDetail.review_count} reviews) · Joined {formatDate(providerDetail.created_at)}
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
                          <button onClick={() => handleSuspend(providerDetail.id, true)} disabled={busyId === providerDetail.id} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
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
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <Image className="w-5 h-5 text-amber-500" /> Work Photos ({providerDetail.work_images.length})
                  </h3>
                  {providerDetail.work_images.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No work photos uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {providerDetail.work_images.map((img) => (
                        <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
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
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-amber-500" /> Reviews ({providerDetail.reviews.length})
                  </h3>
                  {providerDetail.reviews.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {providerDetail.reviews.map((rev) => (
                        <div key={rev.id} className="border border-white/20 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                                  {rev.reviewer_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                                <span className="font-medium text-charcoal text-sm">{rev.reviewer_name}</span>
                                <span className="text-xs text-charcoal/40">{rev.reviewer_email}</span>
                              </div>
                              <div className="flex items-center gap-1 mb-1">
                                {[1,2,3,4,5].map((s) => (
                                  <span key={s} style={{ color: s <= rev.rating ? '#f59e0b' : '#d1d5db', fontSize: '0.875rem' }}>★</span>
                                ))}
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
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2 mb-4">
                    <PhoneCall className="w-5 h-5 text-amber-500" /> People Who Contacted ({providerDetail.contacts.length})
                  </h3>
                  {providerDetail.contacts.length === 0 ? (
                    <p className="text-sm text-charcoal/50">No one has viewed this artisan's phone number yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">User</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">Email</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">Phone</th>
                            <th className="text-left px-4 py-3 font-semibold text-charcoal/70">When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerDetail.contacts.map((c, idx) => (
                            <tr key={c.id} className={`border-b border-white/10 hover:bg-white/10 transition-colors ${idx === providerDetail.contacts.length - 1 ? 'border-b-0' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
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
              <div className="text-center py-16 glass rounded-2xl">
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
                      className="glass rounded-2xl p-6 transition-all duration-300 hover:shadow-xl cursor-pointer hover:ring-2 hover:ring-amber-400/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-lg">{provider.category_icon}</span>
                            <h3 className="text-lg font-bold text-charcoal">{provider.business_name}</h3>
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
                          <p className="text-sm font-medium text-amber-600 mb-2">{provider.category_name}</p>
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
                                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
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
            <div className="text-center py-16 glass rounded-2xl">
              <Activity className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <p className="text-lg font-semibold text-charcoal">No activity yet</p>
              <p className="text-charcoal/60 mt-1">Signups, new businesses, reviews and moderation will appear here.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Who</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Activity</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">Type</th>
                      <th className="text-left px-6 py-4 font-semibold text-charcoal/70">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={log.id} className={`border-b border-white/10 transition-colors hover:bg-white/10 ${idx === logs.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
