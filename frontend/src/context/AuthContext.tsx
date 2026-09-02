import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, GymSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  gym: GymSettings | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshGymSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gym, setGym] = useState<GymSettings | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mf_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    if (data.gym) {
      setGym(data.gym);
    } else {
      const g = await api.getSettings();
      setGym(g);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mf_access_token');
    localStorage.removeItem('mf_refresh_token');
    localStorage.removeItem('mf_user');
    setToken(null);
    setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        gym,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshGymSettings,
      }}
    >
      {children}
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
