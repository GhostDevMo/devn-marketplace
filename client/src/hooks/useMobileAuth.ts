
import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

interface MobileUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface AuthResponse {
  user: MobileUser;
  token: string;
}

export function useMobileAuth() {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const [userResult, tokenResult] = await Promise.all([
        Preferences.get({ key: 'user' }),
        Preferences.get({ key: 'auth_token' })
      ]);

      if (userResult.value && tokenResult.value) {
        setUser(JSON.parse(userResult.value));
        setToken(tokenResult.value);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }

      const data: AuthResponse = await response.json();
      
      await Promise.all([
        Preferences.set({ key: 'user', value: JSON.stringify(data.user) }),
        Preferences.set({ key: 'auth_token', value: data.token })
      ]);
      
      setUser(data.user);
      setToken(data.token);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error during login' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        Preferences.remove({ key: 'user' }),
        Preferences.remove({ key: 'auth_token' })
      ]);
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const register = async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Registration failed' };
      }

      const data: AuthResponse = await response.json();
      
      await Promise.all([
        Preferences.set({ key: 'user', value: JSON.stringify(data.user) }),
        Preferences.set({ key: 'auth_token', value: data.token })
      ]);
      
      setUser(data.user);
      setToken(data.token);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error during registration' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    token,
    login,
    logout,
    register,
    isAuthenticated: !!user,
  };
}
