"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, AuthType, User } from "@/types";
import { HiveAuthUser, HiveAccount } from "@/lib/shared/types";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";

const AuthContext = createContext<AuthState & {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  hiveUser: HiveAuthUser | null;
  setHiveUser: (hiveUser: HiveAuthUser | null) => void;
  refreshHiveAccount: () => Promise<void>;
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
  const [hiveUser, setHiveUser] = useState<HiveAuthUser | null>(null);

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedAuth = localStorage.getItem("authState");
    if (savedAuth) {
      try {
        const { user: savedUser, authType: savedAuthType, hiveUser: savedHiveUser } = JSON.parse(savedAuth);
        setUser(savedUser);
        setAuthType(savedAuthType);
        if (savedHiveUser) {
          setHiveUser(savedHiveUser);
          // If user is authenticated with Hive but doesn't have profile data, refresh it
          if (savedAuthType === "hive" && savedUser && !savedUser.hiveProfile) {
            // Use setTimeout to avoid calling refreshHiveAccount before it's defined
            setTimeout(() => {
              refreshHiveAccount();
            }, 100);
          }
        }
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
      hiveUser: hiveUser,
    }));
  };

  const loginWithHiveUser = async (hiveUsername: string) => {
    try {
      // Create basic user object first
      const basicUser: User = {
        id: hiveUsername,
        username: hiveUsername,
        displayName: hiveUsername,
        isHiveAuth: true,
        hiveUsername: hiveUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set the user immediately for UI responsiveness
      setUser(basicUser);
      setAuthType("hive");

      // Create Hive user object
      const newHiveUser: HiveAuthUser = {
        username: hiveUsername,
        isAuthenticated: true,
      };
      setHiveUser(newHiveUser);

      // Fetch full account data in the background
      console.log("Fetching Hive account data for:", hiveUsername);
      try {
        const accountData = await fetchUserAccount(hiveUsername);
        console.log("Hive account data loaded:", accountData);
        
        if (accountData) {
          // Update hiveUser with account data
          const updatedHiveUser = {
            ...newHiveUser,
            account: accountData as unknown as HiveAccount,
          };
          setHiveUser(updatedHiveUser);

          // Update the main user object with Hive profile data
          const updatedUser = {
            ...basicUser,
            reputation: accountData.reputation,
            reputationFormatted: accountData.reputationFormatted,
            // Liquid balances
            liquidHiveBalance: accountData.liquidHiveBalance,
            liquidHbdBalance: accountData.liquidHbdBalance,
            // Savings balances
            savingsHiveBalance: accountData.savingsHiveBalance,
            savingsHbdBalance: accountData.savingsHbdBalance,
            // Combined balances (for backward compatibility)
            hiveBalance: accountData.hiveBalance,
            hbdBalance: accountData.hbdBalance,
            hivePower: accountData.hivePower,
            rcPercentage: accountData.resourceCredits,
            // Savings data
            savingsApr: accountData.savingsApr,
            pendingWithdrawals: accountData.pendingWithdrawals,
            hiveProfile: accountData.profile,
            hiveStats: accountData.stats,
            // Use Hive profile image as avatar if available
            avatar: accountData.profile.profileImage,
            displayName: accountData.profile.name || hiveUsername,
            bio: accountData.profile.about,
            // Use the actual Hive account creation date
            createdAt: accountData.createdAt,
          };
          setUser(updatedUser);

          console.log("Updated user with Hive profile data:", updatedUser);

          // Save updated state to localStorage
          localStorage.setItem("authState", JSON.stringify({
            user: updatedUser,
            authType: "hive",
            hiveUser: updatedHiveUser,
          }));
        } else {
          console.log("No account data found for:", hiveUsername);
        }
      } catch (profileError) {
        console.error("Error fetching Hive account data:", profileError);
        // Keep the basic user even if profile loading fails
      }
    } catch (error) {
      console.error("Error logging in with Hive user:", error);
      // Keep the basic user even if profile loading fails
    }
  };

  const logout = () => {
    setUser(null);
    setAuthType("guest");
    setHiveUser(null);
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

  const refreshHiveAccount = async () => {
    if (hiveUser?.username) {
      try {
        const accountData = await fetchUserAccount(hiveUser.username);
        if (accountData) {
          // Update hiveUser with account data
          const updatedHiveUser = {
            ...hiveUser,
            account: accountData as unknown as HiveAccount,
          };
          setHiveUser(updatedHiveUser);

          // Also update the main user object with Hive profile data
          if (user) {
            const updatedUser = {
              ...user,
              reputation: accountData.reputation,
              reputationFormatted: accountData.reputationFormatted,
              hiveBalance: accountData.hiveBalance,
              hbdBalance: accountData.hbdBalance,
              hivePower: accountData.hivePower,
              rcPercentage: accountData.resourceCredits,
              hiveProfile: accountData.profile,
              hiveStats: accountData.stats,
              // Use Hive profile image as avatar if available
              avatar: accountData.profile.profileImage || user.avatar,
              displayName: accountData.profile.name || user.displayName,
              bio: accountData.profile.about || user.bio,
              // Use the actual Hive account creation date
              createdAt: accountData.createdAt,
            };
            updateUser(updatedUser);
          }
        }
      } catch (error) {
        console.error("Error refreshing Hive account:", error);
      }
    }
  };

  const value = {
    user,
    authType,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithHiveUser,
    logout,
    updateUser,
    hiveUser,
    setHiveUser,
    refreshHiveAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
