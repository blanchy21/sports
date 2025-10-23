"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, AuthType, User } from "@/types";
import { HiveAuthUser, HiveAccount } from "@/lib/shared/types";
import { fetchUserAccount } from "@/lib/hive-workerbee/account";
import { useAioha } from "@/contexts/AiohaProvider";
import { AuthUser, FirebaseAuth } from "@/lib/firebase/auth";

// Aioha login result type
interface AiohaLoginResult {
  user?: {
    username?: string;
    name?: string;
    account?: HiveAccount;
    session?: string;
  };
  username?: string;
  name?: string;
  id?: string;
  account?: HiveAccount;
  session?: string;
  session_id?: string;
  provider?: string;
  aiohaUserId?: string;
  sessionId?: string;
  errorCode?: number;
  data?: {
    username?: string;
    name?: string;
  };
  result?: {
    username?: string;
    name?: string;
  };
  auth?: {
    username?: string;
    name?: string;
  };
  profile?: {
    name?: string;
    username?: string;
  };
  identity?: {
    name?: string;
    username?: string;
  };
  accountData?: {
    name?: string;
    username?: string;
  };
}

// Aioha instance type
interface AiohaInstance {
  user?: {
    username?: string;
    account?: HiveAccount;
    session?: string;
    sessionId?: string;
    session_id?: string;
  };
  currentUser?: {
    username?: string;
    account?: HiveAccount;
    session?: string;
    sessionId?: string;
    session_id?: string;
  };
  username?: string;
  account?: HiveAccount;
  session?: string;
  sessionId?: string;
  session_id?: string;
  currentProvider?: string;
  providers?: Record<string, {
    user?: {
      username?: string;
      sessionId?: string;
      session_id?: string;
    };
    username?: string;
    sessionId?: string;
    session_id?: string;
    account?: {
      name?: string;
    };
  }>;
  errorCode?: number;
  // Additional properties that might exist
  [key: string]: unknown;
}

// Extended Aioha instance with state properties
interface AiohaInstanceWithState extends AiohaInstance {
  state?: {
    user?: {
      username?: string;
      sessionId?: string;
      session_id?: string;
    };
  };
  _state?: {
    user?: {
      username?: string;
      sessionId?: string;
      session_id?: string;
    };
  };
}

const AuthContext = createContext<AuthState & {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: AiohaLoginResult) => Promise<void>;
  loginWithFirebase: (authUser: AuthUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  upgradeToHive: (hiveUsername: string) => Promise<void>;
  hiveUser: HiveAuthUser | null;
  setHiveUser: (hiveUser: HiveAuthUser | null) => void;
  refreshHiveAccount: () => Promise<void>;
  isClient: boolean;
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
  const [isClient, setIsClient] = useState(false);
  const { aioha, isInitialized } = useAioha();

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    
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

  const loginWithFirebase = (authUser: AuthUser) => {
    const user: User = {
      id: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName,
      avatar: authUser.avatar,
      isHiveAuth: authUser.isHiveUser,
      hiveUsername: authUser.hiveUsername,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    setUser(user);
    setAuthType(authUser.isHiveUser ? "hive" : "soft");
    
    // Save to localStorage
    localStorage.setItem("authState", JSON.stringify({
      user: user,
      authType: authUser.isHiveUser ? "hive" : "soft",
      hiveUser: authUser.isHiveUser ? {
        username: authUser.hiveUsername!,
        isAuthenticated: true,
      } : null,
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

  const loginWithAioha = async (loginResult?: AiohaLoginResult) => {
    console.log("loginWithAioha called, isInitialized:", isInitialized, "aioha:", !!aioha);
    console.log("loginWithAioha loginResult:", loginResult);
    
    if (!isInitialized || !aioha) {
      console.error("Aioha not initialized");
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    try {
      console.log("Processing Aioha authentication...");
      
      // If we have a login result, use it directly
      let userData;
      console.log("Full loginResult object:", JSON.stringify(loginResult, null, 2));
      
      // Add a small delay to allow Aioha to fully process the login
      if (loginResult) {
        console.log("Waiting for Aioha to process login...");
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // After delay, check Aioha instance again
        console.log("Aioha instance after delay:");
        const aiohaInstance = aioha as AiohaInstance;
        console.log("- aioha.user:", aiohaInstance.user);
        console.log("- aioha.currentUser:", aiohaInstance.currentUser);
        console.log("- aioha.username:", aiohaInstance.username);
        console.log("- aioha.account:", aiohaInstance.account);
        console.log("- aioha.session:", aiohaInstance.session);
        console.log("- aioha.state:", (aioha as AiohaInstance & { state?: unknown }).state);
        console.log("- aioha._state:", (aioha as AiohaInstance & { _state?: unknown })._state);
        
        // Try to get user data from Aioha instance after delay
        if (!userData) {
          console.log("Trying to get user data from Aioha instance after delay...");
          if (aiohaInstance.user && aiohaInstance.user.username) {
            userData = {
              username: aiohaInstance.user.username,
              id: aiohaInstance.user.username,
              sessionId: aiohaInstance.user.sessionId || (aiohaInstance.user as { session_id?: string }).session_id,
            };
            console.log("Found user data in Aioha instance after delay:", userData);
          } else if (aiohaInstance.currentUser && aiohaInstance.currentUser.username) {
            userData = {
              username: aiohaInstance.currentUser.username,
              id: aiohaInstance.currentUser.username,
              sessionId: aiohaInstance.currentUser.sessionId || (aiohaInstance.currentUser as { session_id?: string }).session_id,
            };
            console.log("Found currentUser data in Aioha instance after delay:", userData);
          } else if (aiohaInstance.username) {
            userData = {
              username: aiohaInstance.username,
              id: aiohaInstance.username,
              sessionId: aiohaInstance.sessionId || (aiohaInstance as { session_id?: string }).session_id,
            };
            console.log("Found direct username in Aioha instance after delay:", userData);
          }
        }
      }
      
      // Try multiple possible structures for the username
      if (loginResult) {
        // Handle special case where user is already logged in (errorCode 4901)
        if (loginResult.errorCode === 4901) {
          console.log("Handling 'already logged in' case...");
          const aiohaInstance = aioha as AiohaInstance;
          console.log("Current provider:", aiohaInstance.currentProvider);
          
          // For already logged in case, we need to get user data from the current provider
          try {
            // Get the current provider instance
            const currentProvider = aiohaInstance.currentProvider;
            if (currentProvider && aiohaInstance.providers && aiohaInstance.providers[currentProvider]) {
              const providerInstance = aiohaInstance.providers[currentProvider];
              console.log("Provider instance:", providerInstance);
              console.log("Provider instance properties:", Object.keys(providerInstance));
              
              // Try to get user data from the provider instance
              if (providerInstance.user && providerInstance.user.username) {
                userData = {
                  username: providerInstance.user.username,
                  id: providerInstance.user.username,
                  sessionId: providerInstance.user.sessionId || providerInstance.user.session_id,
                };
                console.log("Found user data in provider instance:", userData);
              } else if (providerInstance.username) {
                userData = {
                  username: providerInstance.username,
                  id: providerInstance.username,
                  sessionId: providerInstance.sessionId || providerInstance.session_id,
                };
                console.log("Found username in provider instance:", userData);
              } else if (providerInstance.account && providerInstance.account.name) {
                userData = {
                  username: providerInstance.account.name,
                  id: providerInstance.account.name,
                  sessionId: providerInstance.sessionId || providerInstance.session_id,
                };
                console.log("Found account name in provider instance:", userData);
              } else {
                console.log("No user data found in provider instance, trying other methods...");
                
                // Try to get from Aioha's internal state more comprehensively
                const aiohaWithState = aioha as AiohaInstanceWithState;
                const aiohaState = aiohaWithState.state || aiohaWithState._state;
                if (aiohaState && aiohaState.user && aiohaState.user.username) {
                  userData = {
                    username: aiohaState.user.username,
                    id: aiohaState.user.username,
                    sessionId: aiohaState.user.sessionId || aiohaState.user.session_id,
                  };
                  console.log("Found user data in Aioha state for already logged in case:", userData);
                } else if (aiohaState && typeof aiohaState === 'object' && 'currentUser' in aiohaState && aiohaState.currentUser && typeof aiohaState.currentUser === 'object' && 'username' in aiohaState.currentUser && aiohaState.currentUser.username) {
                  userData = {
                    username: aiohaState.currentUser.username,
                    id: aiohaState.currentUser.username,
                    sessionId: ('sessionId' in aiohaState.currentUser ? aiohaState.currentUser.sessionId : undefined) || ('session_id' in aiohaState.currentUser ? aiohaState.currentUser.session_id : undefined),
                  };
                  console.log("Found currentUser data in Aioha state for already logged in case:", userData);
                } else {
                  console.log("No user data found in Aioha state for already logged in case");
                }
              }
            } else {
              console.log("No current provider or provider instance found");
            }
          } catch (providerError) {
            console.log("Error accessing provider instance:", providerError);
          }
        } else {
          // Normal case - check all possible username locations in loginResult
          // Check all possible username locations
          const possibleUsernames = [
          loginResult.username,
          loginResult.name,
          loginResult.account?.name,
          loginResult.user?.username,
          loginResult.user?.name,
          loginResult.data?.username,
          loginResult.data?.name,
          loginResult.result?.username,
          loginResult.result?.name,
          loginResult.auth?.username,
          loginResult.auth?.name,
          // Additional common patterns
          loginResult.profile?.name,
          loginResult.profile?.username,
          loginResult.identity?.name,
          loginResult.identity?.username,
          loginResult.accountData?.name,
          loginResult.accountData?.username,
        ].filter(Boolean); // Remove null/undefined values
        
        console.log("Possible usernames found:", possibleUsernames);
        
        if (possibleUsernames.length > 0) {
          const username = possibleUsernames[0];
          userData = {
            username: username,
            id: username, // Use username as ID
            sessionId: loginResult.sessionId || loginResult.session_id || loginResult.id,
          };
          console.log("Using extracted username:", userData);
        } else {
          console.log("No username found in loginResult, trying fallback methods...");
        }
        } // Close the else block for normal case
      }
      
      // If we still don't have userData, try fallback methods
      if (!userData) {
        console.log("No userData found in loginResult, trying fallback methods...");
        console.log("Aioha instance:", aioha);
        console.log("Aioha instance keys:", aioha ? Object.keys(aioha) : "No aioha instance");
        
        // Log all properties of the Aioha instance to see what's available
        if (aioha) {
          console.log("Aioha instance properties:");
          Object.keys(aioha).forEach(key => {
            console.log(`- aioha.${key}:`, (aioha as Record<string, unknown>)[key]);
          });
          
          // Try to find user data in any of the Aioha properties
          console.log("Searching for user data in all Aioha properties...");
          for (const key of Object.keys(aioha)) {
            const value = (aioha as Record<string, unknown>)[key];
            if (value && typeof value === 'object') {
              const objValue = value as Record<string, unknown>;
              // Check if this property contains user data
              if (objValue.username || objValue.name || objValue.user || objValue.account) {
                console.log(`Found potential user data in aioha.${key}:`, value);
                
                // Try to extract username from this property
                const potentialUsername = objValue.username || objValue.name || 
                  (objValue.user as Record<string, unknown>)?.username || (objValue.user as Record<string, unknown>)?.name ||
                  (objValue.account as Record<string, unknown>)?.name || (objValue.account as Record<string, unknown>)?.username;
                
                if (potentialUsername) {
                  userData = {
                    username: potentialUsername,
                    id: potentialUsername,
                    sessionId: objValue.sessionId || objValue.session_id || objValue.id,
                  };
                  console.log(`Successfully extracted user data from aioha.${key}:`, userData);
                  break; // Exit the loop once we find user data
                }
              }
            }
          }
        }
        
        try {
          // Check if Aioha has a getUser method or similar
          if (typeof (aioha as any).getUser === 'function') {
            userData = await (aioha as any).getUser();
            console.log("Got user data from Aioha getUser():", userData);
          } else {
            // If no getUser method, try to get from Aioha's internal state
            console.log("Aioha getUser not available, checking for existing session...");
            console.log("Aioha internal state:", {
              user: (aioha as any).user,
              currentUser: (aioha as any).currentUser,
              username: (aioha as any).username,
              account: (aioha as any).account,
              session: (aioha as any).session,
              auth: (aioha as any).auth,
            });
            
            // Try to get username from localStorage or other persistent storage first
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
                } else {
                  throw new Error("No stored username found");
                }
              } catch (parseError) {
                console.log("Could not parse stored auth data:", parseError);
                throw new Error("No valid stored auth data");
              }
            } else {
              throw new Error("No stored auth data");
            }
          }
        } catch (getUserError) {
          console.log("Could not get user data from Aioha:", getUserError);
          
          // Try one more fallback - check if Aioha has user info in its internal state
          try {
            console.log("Trying to extract from Aioha internal state...");
            console.log("Aioha.user:", (aioha as any).user);
            console.log("Aioha.currentUser:", (aioha as any).currentUser);
            console.log("Aioha.username:", (aioha as any).username);
            console.log("Aioha.account:", (aioha as any).account);
            
            if ((aioha as any).user && (aioha as any).user.username) {
              userData = {
                username: (aioha as any).user.username,
                id: (aioha as any).user.username,
                sessionId: (aioha as any).user.sessionId || (aioha as any).user.session_id,
              };
              console.log("Using Aioha internal user data:", userData);
            } else if ((aioha as any).currentUser && (aioha as any).currentUser.username) {
              userData = {
                username: (aioha as any).currentUser.username,
                id: (aioha as any).currentUser.username,
                sessionId: (aioha as any).currentUser.sessionId || (aioha as any).currentUser.session_id,
              };
              console.log("Using Aioha currentUser data:", userData);
            } else if ((aioha as any).username) {
              userData = {
                username: (aioha as any).username,
                id: (aioha as any).username,
                sessionId: (aioha as any).sessionId || (aioha as any).session_id,
              };
              console.log("Using Aioha direct username:", userData);
            } else if ((aioha as any).account && (aioha as any).account.name) {
              userData = {
                username: (aioha as any).account.name,
                id: (aioha as any).account.name,
                sessionId: (aioha as any).sessionId || (aioha as any).session_id,
              };
              console.log("Using Aioha account name:", userData);
            } else {
              throw new Error("No user data found in Aioha internal state");
            }
          } catch (fallbackError) {
            console.log("Fallback user data retrieval failed:", fallbackError);
            throw new Error("Unable to determine username from Aioha authentication. Please try logging in again.");
          }
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

    // Logout from Firebase if user was authenticated via Firebase
    if (authType === "soft") {
      try {
        await FirebaseAuth.signOut();
      } catch (error) {
        console.error("Error logging out from Firebase:", error);
      }
    }
    
    setUser(null);
    setAuthType("guest");
    setHiveUser(null);
    localStorage.removeItem("authState");
  };

  const upgradeToHive = async (hiveUsername: string) => {
    if (!user || authType !== "soft") {
      throw new Error("User must be logged in with a soft account to upgrade");
    }

    try {
      // Update Firebase profile to mark as Hive user
      await FirebaseAuth.upgradeToHive(user.id, hiveUsername);
      
      // Update local user state
      const updatedUser = {
        ...user,
        isHiveAuth: true,
        hiveUsername: hiveUsername,
      };
      
      setUser(updatedUser);
      setAuthType("hive");
      
      // Create Hive user object
      const newHiveUser: HiveAuthUser = {
        username: hiveUsername,
        isAuthenticated: true,
      };
      setHiveUser(newHiveUser);

      // Fetch Hive account data
      try {
        const accountData = await fetchUserAccount(hiveUsername);
        if (accountData) {
          const updatedHiveUser = {
            ...newHiveUser,
            account: accountData as unknown as HiveAccount,
          };
          setHiveUser(updatedHiveUser);

          // Update the main user object with Hive profile data
          const userWithHiveData = {
            ...updatedUser,
            reputation: accountData.reputation,
            reputationFormatted: accountData.reputationFormatted,
            liquidHiveBalance: accountData.liquidHiveBalance,
            liquidHbdBalance: accountData.liquidHbdBalance,
            savingsHiveBalance: accountData.savingsHiveBalance,
            savingsHbdBalance: accountData.savingsHbdBalance,
            hiveBalance: accountData.hiveBalance,
            hbdBalance: accountData.hbdBalance,
            hivePower: accountData.hivePower,
            rcPercentage: accountData.resourceCredits,
            savingsApr: accountData.savingsApr,
            pendingWithdrawals: accountData.pendingWithdrawals,
            hiveProfile: accountData.profile,
            hiveStats: accountData.stats,
            avatar: accountData.profile.profileImage || user.avatar,
            displayName: accountData.profile.name || user.displayName,
            bio: accountData.profile.about || user.bio,
            createdAt: accountData.createdAt,
          };
          setUser(userWithHiveData);
        }
      } catch (profileError) {
        console.error("Error fetching Hive account data:", profileError);
        // Keep the basic user even if profile loading fails
      }

      // Save updated state to localStorage
      localStorage.setItem("authState", JSON.stringify({
        user: updatedUser,
        authType: "hive",
        hiveUser: newHiveUser,
      }));

    } catch (error) {
      console.error("Error upgrading to Hive account:", error);
      throw error;
    }
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
    loginWithFirebase,
    logout,
    updateUser,
    upgradeToHive,
    hiveUser,
    setHiveUser,
    refreshHiveAccount,
    isClient,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
