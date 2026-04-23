import { apiClient } from './api';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact: string;
}

export const setUserData = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_data', JSON.stringify(user));
    // Trigger a custom event to notify the auth context
    window.dispatchEvent(new CustomEvent('userLogin', { detail: user }));
  }
};

export const clearUserData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_data');
    localStorage.removeItem('auth_token');
    // Trigger a custom event to notify the auth context
    window.dispatchEvent(new CustomEvent('userLogout'));
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
  }
  return null;
};