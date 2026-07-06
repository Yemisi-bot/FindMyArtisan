import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MapPin, Menu, X, LogOut, User, Shield, Store, ChevronDown, Search, Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

  // Close the account dropdown on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAccountOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
    setAccountOpen(false);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  // Shared active/idle styles for nav links
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-amber-500/15 text-amber-700'
        : 'text-charcoal/70 hover:text-charcoal hover:bg-white/40'
    }`;

  // Primary links shown in the center of the bar
  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass} onClick={closeMobile}>
        Home
      </NavLink>
      <NavLink to="/discover" className={linkClass} onClick={closeMobile}>
        Find Services
      </NavLink>
      {!isAuthenticated && (
        <NavLink to="/signup" className={linkClass} onClick={closeMobile}>
          For Artisans
        </NavLink>
      )}
      {isProvider && (
        <NavLink to="/my-business" className={linkClass} onClick={closeMobile}>
          My Business
        </NavLink>
      )}
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isActive ? 'bg-teal-500/15 text-teal-700' : 'text-teal-700/80 hover:text-teal-700 hover:bg-teal-50/60'
            }`
          }
          onClick={closeMobile}
        >
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto my-3">
        <div className="glass-strong px-5 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMobile}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-charcoal hidden sm:block">
              FindMy<span className="text-amber-600">Artisan</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">{navLinks}</div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/40 hover:bg-white/60 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="text-sm font-medium text-charcoal">
                    {user?.fullName?.split(' ')[0] || 'User'}
                  </span>
                  {isProvider && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      Artisan
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-charcoal/50 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-60 glass-strong p-2 animate-fade-in">
                    <div className="px-3 py-2 border-b border-white/30 mb-1">
                      <p className="text-sm font-semibold text-charcoal truncate">{user?.fullName}</p>
                      <p className="text-xs text-charcoal/50 truncate">{user?.email}</p>
                    </div>
                    <DropdownLink to="/" icon={<Home className="w-4 h-4" />} label="Home" onClick={() => setAccountOpen(false)} />
                    <DropdownLink to="/discover" icon={<Search className="w-4 h-4" />} label="Find Services" onClick={() => setAccountOpen(false)} />
                    {isProvider && (
                      <DropdownLink to="/my-business" icon={<Store className="w-4 h-4" />} label="My Business" onClick={() => setAccountOpen(false)} />
                    )}
                    {isAdmin && (
                      <DropdownLink to="/admin" icon={<Shield className="w-4 h-4" />} label="Admin Dashboard" onClick={() => setAccountOpen(false)} />
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-glass py-2 px-4 text-sm">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary py-2 px-4 text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/30 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-charcoal" /> : <Menu className="w-5 h-5 text-charcoal" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 glass-strong p-4 flex flex-col gap-1.5 animate-fade-in">
            {navLinks}
            <hr className="border-white/20 my-1" />
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20">
                  {isAdmin ? <Shield className="w-4 h-4 text-teal-600" /> : <User className="w-4 h-4 text-amber-600" />}
                  <span className="text-sm font-medium text-charcoal">{user?.fullName || 'User'}</span>
                  {isProvider && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Artisan</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-glass flex items-center justify-center gap-1.5 py-2.5 text-sm w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={closeMobile} className="btn-glass text-center py-2.5 text-sm">
                  Login
                </Link>
                <Link to="/signup" onClick={closeMobile} className="btn-primary text-center py-2.5 text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function DropdownLink({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-charcoal/80 hover:text-charcoal hover:bg-white/40 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
