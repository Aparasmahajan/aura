import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../utils/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'super' | 'admin' | 'user';
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

  if (response.error || response.message === 'FAILURE') {
    return {
      success: false,
      error: response.error,
      message: response.message,
    };
  }

  if (response.data) {
    const { token, username, email, roles } = response.data;
    const role = roles && roles.length > 0 ? roles[0].name : 'user'; // pick the first role
    // Fallback to decoded JWT userId if roles is empty
    let id = '';
    if (roles && roles.length > 0 && roles[0].roleId) {
      id = roles[0].roleId.toString();
    } else {
      // Try to get userId from JWT
      const storedToken = token || apiClient.getAuthToken();
      if (storedToken) {
        const payload = apiClient.decodeJwt(storedToken);
        id = payload?.userId?.toString() || payload?.sub?.toString() || '';
      }
    }
    const loggedInUser: User = {
      id,
      username,
      email,
      role: role as 'super' | 'admin' | 'user',
    };

    if (response.data?.user) {
      setUser(response.data.user);
      return { success: true };
    }

    setUser(loggedInUser);

    return { success: true };
  }

  return { success: false, error: 'Login failed' };
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
