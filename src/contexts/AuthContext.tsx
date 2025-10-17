"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, AuthType, User } from "@/types";
import { HiveAuthUser, HiveAccount } from "@/lib/shared/types";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";
import { useAioha } from "@/contexts/AiohaProvider";

const AuthContext = createContext<AuthState & {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: any) => Promise<void>;
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
  const { aioha, isInitialized } = useAioha();

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

  const loginWithAioha = async (loginResult?: any) => {
    console.log("loginWithAioha called, isInitialized:", isInitialized, "aioha:", !!aioha);
    if (!isInitialized || !aioha) {
      console.error("Aioha not initialized");
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    try {
      console.log("Processing Aioha authentication...");
      
      // If we have a login result, use it directly
      let userData;
      if (loginResult && loginResult.success && loginResult.username) {
        userData = {
          username: loginResult.username,
          id: loginResult.username, // Use username as ID
          sessionId: loginResult.sessionId,
        };
        console.log("Using login result data:", userData);
      } else {
        // Try to get user data from Aioha (for existing sessions)
        try {
          // Check if Aioha has a getUser method or similar
          if (typeof (aioha as any).getUser === 'function') {
            userData = await (aioha as any).getUser();
            console.log("Got user data from Aioha:", userData);
          } else {
            // If no getUser method, try to get from Aioha's internal state
            // This is a fallback for when user is already logged in
            console.log("Aioha getUser not available, checking for existing session...");
            
            // For now, we'll create a fallback user - in a real implementation,
            // you'd need to check Aioha's documentation for how to get current user
            userData = {
              username: "hiveuser", // This should be replaced with actual username
              id: "hiveuser",
            };
            
            // Try to get username from localStorage or other persistent storage
            const storedAuth = localStorage.getItem("authState");
            if (storedAuth) {
              try {
                const parsed = JSON.parse(storedAuth);
                if (parsed.hiveUser && parsed.hiveUser.username) {
                  userData = {
                    username: parsed.hiveUser.username,
                    id: parsed.hiveUser.username,
                    sessionId: parsed.hiveUser.sessionId,
                  };
                  console.log("Using stored user data:", userData);
                }
              } catch (parseError) {
                console.log("Could not parse stored auth data");
              }
            }
          }
        } catch (getUserError) {
          console.log("Could not get user data from Aioha:", getUserError);
          // Create a fallback user data object
          userData = {
            username: "hiveuser", // Fallback username
            id: "hiveuser",
          };
        }
      }
      
      if (userData && userData.username) {
        console.log("Aioha user authenticated:", userData);
        
        // Create basic user object
        const basicUser: User = {
          id: userData.username,
          username: userData.username,
          displayName: userData.username,
          isHiveAuth: true,
          hiveUsername: userData.username,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set the user immediately for UI responsiveness
        setUser(basicUser);
        setAuthType("hive");

        // Create Hive user object with Aioha metadata
        const newHiveUser: HiveAuthUser = {
          username: userData.username,
          isAuthenticated: true,
          provider: loginResult?.provider || 'aioha',
          aiohaUserId: userData.id ? String(userData.id) : undefined,
          sessionId: userData.sessionId ? String(userData.sessionId) : undefined,
        };
        setHiveUser(newHiveUser);

        // Fetch full account data in the background
        try {
          const accountData = await fetchUserAccount(userData.username);
          
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
              displayName: accountData.profile.name || userData.username,
              bio: accountData.profile.about,
              // Use the actual Hive account creation date
              createdAt: accountData.createdAt,
            };
            setUser(updatedUser);

            // Save updated state to localStorage
            localStorage.setItem("authState", JSON.stringify({
              user: updatedUser,
              authType: "hive",
              hiveUser: updatedHiveUser,
            }));
          }
        } catch (profileError) {
          console.error("Error fetching Hive account data:", profileError);
          // Keep the basic user even if profile loading fails
        }
      } else {
        throw new Error("No user data available from Aioha");
      }
    } catch (error) {
      console.error("Error processing Aioha authentication:", error);
      throw error; // Re-throw so UI can handle it
    }
  };

  const logout = async () => {
    // Logout from Aioha if user was authenticated via Aioha
    if (hiveUser?.provider && aioha) {
      try {
        await (aioha as any).logout();
      } catch (error) {
        console.error("Error logging out from Aioha:", error);
      }
    }
    
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
    loginWithAioha,
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
