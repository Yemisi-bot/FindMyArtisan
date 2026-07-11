import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

// ── Context type ──────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone?: string, role?: string) => Promise<User>;
  verifyOtp: (email: string, otp: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then((res) => {
          if (res.data.success && res.data.data) {
            setUser(res.data.data as User);
            localStorage.setItem('user', JSON.stringify(res.data.data));
          } else {
            throw new Error('Invalid session');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Login failed');
    }

    const data = res.data.data as { token: string; user: User };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, phone?: string, role?: string) => {
    const res = await authApi.register({ email, password, fullName, phone, role });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Registration failed');
    }

    // Email verification is disabled for now — registration logs the user in
    // immediately by returning a token + user (see docs/NEXT_STEPS.md).
    const data = res.data.data as { token: string; user: User };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const res = await authApi.verifyOtp({ email, otp });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Verification failed');
    }

    const data = res.data.data as { token: string; user: User };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
