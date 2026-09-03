import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { User, GymSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  gym: GymSettings | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  inactivityTimeoutMinutes: number;
  setInactivityTimeout: (minutes: number) => void;
  resetActivityTimer: () => void;
  login: (username: string, password: string) => Promise<any>;
  logout: (reason?: string) => void;
  updateUser: (user: User) => void;
  refreshGymSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gym, setGym] = useState<GymSettings | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mf_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inactivity Auto-Logout State (Default: 30 minutes, 0 = disabled)
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('mf_inactivity_minutes');
    return saved !== null ? Number(saved) : 30;
  });

  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);
  const lastActivityRef = useRef<number>(Date.now());

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
  };

  const setInactivityTimeout = (minutes: number) => {
    setInactivityTimeoutMinutes(minutes);
    localStorage.setItem('mf_inactivity_minutes', minutes.toString());
    resetActivityTimer();
  };

  const fetchInitialData = async () => {
    try {
      const storedToken = localStorage.getItem('mf_access_token');
      if (storedToken) {
        const [profileData, gymData] = await Promise.all([
          api.getProfile(),
          api.getSettings(),
        ]);
        setUser(profileData);
        setGym(gymData);
      }
    } catch (err) {
      console.error('Session expired or failed to load:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login({ username, password });
    localStorage.setItem('mf_access_token', data.access);
    localStorage.setItem('mf_refresh_token', data.refresh);
    localStorage.setItem('mf_user', JSON.stringify(data.user));
    
    setToken(data.access);
    setUser(data.user);
    resetActivityTimer();

    if (data.gym) {
      setGym(data.gym);
    } else {
      const g = await api.getSettings();
      setGym(g);
    }
    return data;
  };

  const logout = (reason?: string) => {
    localStorage.removeItem('mf_access_token');
    localStorage.removeItem('mf_refresh_token');
    localStorage.removeItem('mf_user');
    if (reason) {
      localStorage.setItem('mf_logout_notice', reason);
    }
    setToken(null);
    setUser(null);
    setShowInactivityWarning(false);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('mf_user', JSON.stringify(updated));
  };

  const refreshGymSettings = async () => {
    try {
      const updated = await api.getSettings();
      setGym(updated);
    } catch (e) {
      console.error('Failed to refresh settings', e);
    }
  };

  // Listen to user interactions to reset the inactivity timer
  useEffect(() => {
    if (!token || !user) return;

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle activity recording to at most once per 2 seconds
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [token, user, showInactivityWarning]);

  // Periodic inactivity checker (Runs every 1 second)
  useEffect(() => {
    if (!token || !user || inactivityTimeoutMinutes <= 0) {
      setShowInactivityWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      const totalTimeoutMs = inactivityTimeoutMinutes * 60 * 1000;
      const warningThresholdMs = Math.min(120 * 1000, totalTimeoutMs / 2); // 2 mins or half the timeout
      const remainingMs = totalTimeoutMs - elapsedMs;

      if (remainingMs <= 0) {
        logout(`You were automatically logged out due to ${inactivityTimeoutMinutes} minutes of inactivity for security.`);
      } else if (remainingMs <= warningThresholdMs) {
        setShowInactivityWarning(true);
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      } else {
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, user, inactivityTimeoutMinutes, showInactivityWarning]);

  return (
    <AuthContext.Provider
      value={{
        user,
        gym,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        inactivityTimeoutMinutes,
        setInactivityTimeout,
        resetActivityTimer,
        login,
        logout,
        updateUser,
        refreshGymSettings,
      }}
    >
      {children}

      {/* Session Inactivity Warning Modal */}
      {showInactivityWarning && !!user && !!token && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-amber-200 shadow-2xl p-6 sm:p-7 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm animate-pulse">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Session Expiring Soon
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You have been inactive. For gym data security, your session will automatically log out in:
              </p>
            </div>

            <div className="py-2.5 px-4 bg-amber-50 rounded-2xl border border-amber-200 inline-block">
              <span className="font-mono text-2xl font-black text-amber-700 tracking-wider">
                {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => logout()}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Log Out Now
              </button>
              <button
                type="button"
                onClick={resetActivityTimer}
                className="flex-1 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Stay Logged In</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

