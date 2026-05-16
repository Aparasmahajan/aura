import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../utils/api';

export type UserRole = 'super' | 'admin' | 'sub_admin' | 'administrator' | 'student';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = apiClient.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiClient.login(username, password);

    if (response.error) {
      return { success: false, error: response.error, message: response.message };
    }

    const data = response.data;
    if (!data) return { success: false, error: 'Login failed' };

    const rawRole = Array.isArray(data.roles) && data.roles.length > 0
      ? data.roles[0].name.toLowerCase() : 'student';

    const storedToken = data.token || apiClient.getAuthToken();
    let id = '';
    if (storedToken) {
      const payload = apiClient.decodeJwt(storedToken);
      id = payload?.userId?.toString() || payload?.sub?.toString() || '';
    }

    const loggedInUser: User = {
      id,
      username: data.username ?? username,
      email: data.email ?? '',
      role: rawRole as UserRole,
      fullName: data.fullName ?? data.full_name ?? undefined,
    };

    setUser(loggedInUser);
    return { success: true };
  };


  const signup = async (username: string, email: string, password: string) => {
    const response = await apiClient.signup(username, email, password);

    if (response.error) {
      return { success: false, error: response.error };
    }

    if (response.data?.user) {
      setUser(response.data.user);
      return { success: true };
    }

    if (response.data) {
      return { success: true };
    }

    return { success: false, error: 'Signup failed' };
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
