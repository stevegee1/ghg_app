import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'PARTNER';
  licenseeId: string | null;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  primaryRole?: string;
  organisationCountry?: string;
  industrySector?: string;
  hasCompletedAssessment?: boolean;
  isOnboardingComplete?: boolean;
  assuranceIntent?: 'CARBON' | 'JOB' | 'DUAL';
  emailVerified?: boolean;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ghg_auth_token') || sessionStorage.getItem('ghg_auth_token') || null;
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ghg_auth_user') || sessionStorage.getItem('ghg_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem('ghg_auth_token', newToken);
      localStorage.setItem('ghg_auth_user', JSON.stringify(newUser));
    } catch (e) {
      console.warn('Failed to persist auth token', e);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('ghg_auth_user', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist updated user', e);
      }
      return updated;
    });
  };

  React.useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setUser((prev) => {
            const updated = { ...prev, ...data.user };
            try {
              localStorage.setItem('ghg_auth_user', JSON.stringify(updated));
            } catch {
              // Ignore storage errors
            }
            return updated;
          });
        }
      })
      .catch(() => {
        // Network resilience: keep existing cached user if offline
      });
  }, [token]);

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('ghg_auth_token');
      localStorage.removeItem('ghg_auth_user');
    } catch (e) {
      console.warn('Failed to clear auth token', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
