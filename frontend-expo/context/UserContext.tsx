import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  displayName: string;
  role: UserRole;
}

interface UserContextValue {
  user: User;
  setUser: (user: User) => void;
  toggleAdmin: () => void;
  isAdmin: boolean;
}

const defaultUser: User = {
  id: '1',
  displayName: 'Admin',
  role: 'admin',
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User>(defaultUser);

  const setUser = useCallback((u: User) => {
    setUserState(u);
  }, []);

  const toggleAdmin = useCallback(() => {
    setUserState((prev) => ({
      ...prev,
      role: prev.role === 'admin' ? 'user' : 'admin',
    }));
  }, []);

  const value: UserContextValue = {
    user,
    setUser,
    toggleAdmin,
    isAdmin: user.role === 'admin',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
