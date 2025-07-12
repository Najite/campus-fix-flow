
import { User } from '../types';
import { db } from './database';

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('current_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem('current_user', JSON.stringify(user));
};

export const logout = (): void => {
  localStorage.removeItem('current_user');
};

export const authenticateUser = (username: string, password: string): User | null => {
  const user = db.users.getByUsername(username);
  if (user && user.password === password) {
    setCurrentUser(user);
    return user;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  return user?.role === role;
};
