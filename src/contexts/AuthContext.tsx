"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, AuthType, User } from "@/types";

const AuthContext = createContext<AuthState & {
  login: (user: User, authType: AuthType) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
} | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authType, setAuthType] = useState<AuthType>("guest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedAuth = localStorage.getItem("authState");
    if (savedAuth) {
      try {
        const { user: savedUser, authType: savedAuthType } = JSON.parse(savedAuth);
        setUser(savedUser);
        setAuthType(savedAuthType);
      } catch (error) {
        console.error("Error parsing saved auth state:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User, newAuthType: AuthType) => {
    setUser(newUser);
    setAuthType(newAuthType);
    
    // Save to localStorage
    localStorage.setItem("authState", JSON.stringify({
      user: newUser,
      authType: newAuthType,
    }));
  };

  const logout = () => {
    setUser(null);
    setAuthType("guest");
    localStorage.removeItem("authState");
  };

  const updateUser = (userUpdate: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userUpdate };
      setUser(updatedUser);
      
      // Update localStorage
      const savedAuth = localStorage.getItem("authState");
      if (savedAuth) {
        try {
          const authState = JSON.parse(savedAuth);
          authState.user = updatedUser;
          localStorage.setItem("authState", JSON.stringify(authState));
        } catch (error) {
          console.error("Error updating saved auth state:", error);
        }
      }
    }
  };

  const value = {
    user,
    authType,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
