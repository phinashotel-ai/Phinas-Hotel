"use client";

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
      }
    }

    // Listen for login/logout events
    const handleUserLogin = (event: CustomEvent) => {
      setUser(event.detail);
    };

    const handleUserLogout = () => {
      setUser(null);
    };

    window.addEventListener('userLogin', handleUserLogin as EventListener);
    window.addEventListener('userLogout', handleUserLogout);

    return () => {
      window.removeEventListener('userLogin', handleUserLogin as EventListener);
      window.removeEventListener('userLogout', handleUserLogout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}