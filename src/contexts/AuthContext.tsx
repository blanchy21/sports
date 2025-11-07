"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthState, AuthType, User } from "@/types";
import { HiveAuthUser, HiveAccount } from "@/lib/shared/types";
import { fetchUserAccount, type UserAccountData } from "@/lib/hive-workerbee/account";
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

// Enhanced Aioha instance with comprehensive typing
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
  // Additional methods that might exist
  getUser?: () => Promise<AiohaUserData>;
  auth?: AiohaAuthData;
}

// Aioha user data type
interface AiohaUserData {
  username?: string;
  name?: string;
  id?: string;
  sessionId?: string;
  session_id?: string;
  account?: HiveAccount;
  profile?: {
    name?: string;
    username?: string;
    avatar?: string;
    bio?: string;
  };
  [key: string]: unknown;
}

// Aioha auth data type
interface AiohaAuthData {
  username?: string;
  name?: string;
  sessionId?: string;
  session_id?: string;
  [key: string]: unknown;
}

// Enhanced Aioha instance types for better type safety
interface AiohaInstanceWithUser {
  user?: {
    username?: string;
    sessionId?: string;
    session_id?: string;
    id?: string;
    [key: string]: unknown;
  };
  currentUser?: {
    username?: string;
    sessionId?: string;
    session_id?: string;
    id?: string;
    [key: string]: unknown;
  };
  username?: string;
  sessionId?: string;
  session_id?: string;
  account?: {
    name?: string;
    [key: string]: unknown;
  };
  logout?: () => Promise<void>;
  [key: string]: unknown;
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      let userData: AiohaUserData | null = null;
      console.log("Full loginResult object:", JSON.stringify(loginResult, null, 2));
      
      // Enhanced logging to understand the structure
      if (loginResult) {
        console.log("=== DETAILED LOGIN RESULT ANALYSIS ===");
        console.log("loginResult type:", typeof loginResult);
        console.log("loginResult keys:", Object.keys(loginResult));
        console.log("loginResult.success:", (loginResult as any).success);
        console.log("loginResult.username:", loginResult.username);
        console.log("loginResult.user:", loginResult.user);
        console.log("loginResult.account:", loginResult.account);
        console.log("loginResult.session:", loginResult.session);
        console.log("loginResult.sessionId:", loginResult.sessionId);
        console.log("loginResult.session_id:", loginResult.session_id);
        
        // Log all properties for debugging
        console.log("All loginResult properties:");
        Object.entries(loginResult).forEach(([key, value]) => {
          console.log(`  ${key}:`, value, `(type: ${typeof value})`);
        });
        console.log("=== END ANALYSIS ===");
      }
      
      // First, check if the loginResult itself contains user data
      if (loginResult) {
        console.log("Checking loginResult for user data...");
        
        // Try multiple ways to extract username from the login result
        let extractedUsername: string | null = null;
        let extractedSessionId: string | null = null;
        
        // Method 1: Direct username property
        if (loginResult.username && typeof loginResult.username === 'string' && loginResult.username.trim()) {
          extractedUsername = loginResult.username.trim();
          console.log("Found direct username:", extractedUsername);
        }
        
        // Method 2: User object with username
        if (!extractedUsername && loginResult.user) {
          if (loginResult.user.username && typeof loginResult.user.username === 'string' && loginResult.user.username.trim()) {
            extractedUsername = loginResult.user.username.trim();
            extractedSessionId = loginResult.user.session || (loginResult.user as any).sessionId || (loginResult.user as any).session_id;
            console.log("Found username in user object:", extractedUsername);
          } else if (loginResult.user.name && typeof loginResult.user.name === 'string' && loginResult.user.name.trim()) {
            extractedUsername = loginResult.user.name.trim();
            extractedSessionId = loginResult.user.session || (loginResult.user as any).sessionId || (loginResult.user as any).session_id;
            console.log("Found name in user object:", extractedUsername);
          }
        }
        
        // Method 3: Account object
        if (!extractedUsername && loginResult.account) {
          if ((loginResult.account as any).username && typeof (loginResult.account as any).username === 'string' && (loginResult.account as any).username.trim()) {
            extractedUsername = (loginResult.account as any).username.trim();
            console.log("Found username in account object:", extractedUsername);
          } else if (loginResult.account.name && typeof loginResult.account.name === 'string' && loginResult.account.name.trim()) {
            extractedUsername = loginResult.account.name.trim();
            console.log("Found name in account object:", extractedUsername);
          }
        }
        
        // Method 4: Deep search for username in any nested property
        if (!extractedUsername) {
          console.log("Searching for username in loginResult properties...");
          const findUsername = (obj: any, depth = 0): string | null => {
            if (depth > 3) return null; // Prevent infinite recursion
            if (typeof obj !== 'object' || obj === null) return null;
            
            for (const [key, value] of Object.entries(obj)) {
              if ((key === 'username' || key === 'name') && typeof value === 'string' && value.trim()) {
                return value.trim();
              }
              if (typeof value === 'object' && value !== null) {
                const found = findUsername(value, depth + 1);
                if (found) return found;
              }
            }
            return null;
          };
          
          extractedUsername = findUsername(loginResult);
          if (extractedUsername) {
            console.log("Found username in nested loginResult:", extractedUsername);
          }
        }
        
        // If we found a username, create userData
        if (extractedUsername) {
          userData = {
            username: extractedUsername,
            id: extractedUsername,
            sessionId: extractedSessionId || loginResult.session || loginResult.sessionId || loginResult.session_id,
          };
          console.log("Successfully extracted user data from loginResult:", userData);
        } else {
          console.log("No username found in loginResult, will try other methods...");
          console.log("This might be a Keychain success response without user data - will try to get from Aioha instance");
        }
      }
      
      // Add a small delay to allow Aioha to fully process the login
      if (loginResult && !userData) {
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
              sessionId: aiohaInstance.user.sessionId || aiohaInstance.user.session_id,
            };
            console.log("Found user data in Aioha instance after delay:", userData);
          } else if (aiohaInstance.currentUser && aiohaInstance.currentUser.username) {
            userData = {
              username: aiohaInstance.currentUser.username,
              id: aiohaInstance.currentUser.username,
              sessionId: aiohaInstance.currentUser.sessionId || aiohaInstance.currentUser.session_id,
            };
            console.log("Found currentUser data in Aioha instance after delay:", userData);
          } else if (aiohaInstance.username) {
            userData = {
              username: aiohaInstance.username,
              id: aiohaInstance.username,
              sessionId: aiohaInstance.sessionId || aiohaInstance.session_id,
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
                  const currentUser = aiohaState.currentUser as { username: string; sessionId?: string; session_id?: string };
                  userData = {
                    username: currentUser.username,
                    id: currentUser.username,
                    sessionId: currentUser.sessionId || currentUser.session_id,
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
                    username: potentialUsername as string,
                    id: potentialUsername as string,
                    sessionId: (objValue.sessionId || objValue.session_id || objValue.id) as string | undefined,
                  };
                  console.log(`Successfully extracted user data from aioha.${key}:`, userData);
                  break; // Exit the loop once we find user data
                }
              }
            }
          }
        }
        
        // If we still don't have userData and we have a loginResult, try retry mechanism
        if (loginResult && !userData) {
          console.log("No user data found in loginResult, attempting retry mechanism...");
          
          const maxRetries = 3;
          const baseDelay = 500; // Start with 500ms
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const delay = baseDelay * attempt; // Progressive delay: 500ms, 1000ms, 1500ms
            console.log(`Retry attempt ${attempt}/${maxRetries}: Waiting ${delay}ms for Aioha to process login...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              console.log(`Retry attempt ${attempt}: Checking Aioha internal state...`);
              const aiohaWithUser = aioha as AiohaInstanceWithUser;
              console.log(`Retry attempt ${attempt}: Aioha.user:`, aiohaWithUser.user);
              console.log(`Retry attempt ${attempt}: Aioha.currentUser:`, aiohaWithUser.currentUser);
              console.log(`Retry attempt ${attempt}: Aioha.username:`, aiohaWithUser.username);
              console.log(`Retry attempt ${attempt}: Aioha.account:`, aiohaWithUser.account);
              
              // Try to get user data from Aioha's internal state
              if (aiohaWithUser.user && aiohaWithUser.user.username) {
                userData = {
                  username: aiohaWithUser.user.username,
                  id: aiohaWithUser.user.username,
                  sessionId: aiohaWithUser.user.sessionId || aiohaWithUser.user.session_id,
                };
                console.log(`Retry attempt ${attempt}: Found user data in Aioha.user:`, userData);
                break;
              } else if (aiohaWithUser.currentUser && aiohaWithUser.currentUser.username) {
                userData = {
                  username: aiohaWithUser.currentUser.username,
                  id: aiohaWithUser.currentUser.username,
                  sessionId: aiohaWithUser.currentUser.sessionId || aiohaWithUser.currentUser.session_id,
                };
                console.log(`Retry attempt ${attempt}: Found user data in Aioha.currentUser:`, userData);
                break;
              } else if (aiohaWithUser.username) {
                userData = {
                  username: aiohaWithUser.username,
                  id: aiohaWithUser.username,
                  sessionId: aiohaWithUser.sessionId || aiohaWithUser.session_id,
                };
                console.log(`Retry attempt ${attempt}: Found user data in Aioha.username:`, userData);
                break;
              } else if (aiohaWithUser.account && aiohaWithUser.account.name) {
                userData = {
                  username: aiohaWithUser.account.name,
                  id: aiohaWithUser.account.name,
                  sessionId: aiohaWithUser.sessionId || aiohaWithUser.session_id,
                };
                console.log(`Retry attempt ${attempt}: Found user data in Aioha.account:`, userData);
                break;
              } else {
                console.log(`Retry attempt ${attempt}: No user data found in Aioha internal state`);
              }
            } catch (retryError) {
              console.log(`Retry attempt ${attempt}: Error checking Aioha state:`, retryError);
            }
          }
        }
        
        try {
          // Check if Aioha has a getUser method or similar
          if (typeof (aioha as AiohaInstanceWithState).getUser === 'function') {
            const getUserResult = await (aioha as AiohaInstanceWithState).getUser!();
            userData = getUserResult as AiohaUserData;
            console.log("Got user data from Aioha getUser():", userData);
          } else {
            // If no getUser method, try to get from Aioha's internal state
            console.log("Aioha getUser not available, checking for existing session...");
            console.log("Aioha internal state:", {
              user: (aioha as AiohaInstanceWithState).user,
              currentUser: (aioha as AiohaInstanceWithState).currentUser,
              username: (aioha as AiohaInstanceWithState).username,
              account: (aioha as AiohaInstanceWithState).account,
              session: (aioha as AiohaInstanceWithState).session,
              auth: (aioha as AiohaInstanceWithState).auth,
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
            const aiohaWithUser = aioha as AiohaInstanceWithUser;
            console.log("Aioha.user:", aiohaWithUser.user);
            console.log("Aioha.currentUser:", aiohaWithUser.currentUser);
            console.log("Aioha.username:", aiohaWithUser.username);
            console.log("Aioha.account:", aiohaWithUser.account);
            
            if (aiohaWithUser.user && aiohaWithUser.user.username) {
              userData = {
                username: aiohaWithUser.user.username,
                id: aiohaWithUser.user.username,
                sessionId: aiohaWithUser.user.sessionId || aiohaWithUser.user.session_id,
              };
              console.log("Using Aioha internal user data:", userData);
            } else if (aiohaWithUser.currentUser && aiohaWithUser.currentUser.username) {
              userData = {
                username: aiohaWithUser.currentUser.username,
                id: aiohaWithUser.currentUser.username,
                sessionId: aiohaWithUser.currentUser.sessionId || aiohaWithUser.currentUser.session_id,
              };
              console.log("Using Aioha currentUser data:", userData);
            } else if (aiohaWithUser.username) {
              userData = {
                username: aiohaWithUser.username,
                id: aiohaWithUser.username,
                sessionId: aiohaWithUser.sessionId || aiohaWithUser.session_id,
              };
              console.log("Using Aioha direct username:", userData);
            } else if (aiohaWithUser.account && aiohaWithUser.account.name) {
              userData = {
                username: aiohaWithUser.account.name,
                id: aiohaWithUser.account.name,
                sessionId: aiohaWithUser.sessionId || aiohaWithUser.session_id,
              };
              console.log("Using Aioha account name:", userData);
            } else {
              throw new Error("No user data found in Aioha internal state");
            }
          } catch (fallbackError) {
            console.log("Fallback user data retrieval failed:", fallbackError);
            console.log("Final Aioha state check:");
            console.log("- aioha object keys:", Object.keys(aioha));
            console.log("- aioha.user:", (aioha as any).user);
            console.log("- aioha.currentUser:", (aioha as any).currentUser);
            console.log("- aioha.username:", (aioha as any).username);
            console.log("- aioha.account:", (aioha as any).account);
            console.log("- aioha.session:", (aioha as any).session);
            console.log("- aioha.auth:", (aioha as any).auth);
            
            throw new Error("Unable to determine username from Aioha authentication. This may be due to a temporary issue with the authentication provider. Please try logging in again or use a different authentication method.");
          }
        }
      }
      
      if (userData && userData.username) {
        console.log("Aioha user authenticated:", userData);
        
        // Create basic user object
        const basicUser: User = {
          id: userData.username!,
          username: userData.username!,
          displayName: userData.username!,
          isHiveAuth: true,
          hiveUsername: userData.username!,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set the user immediately for UI responsiveness
        setUser(basicUser);
        setAuthType("hive");

        // Create Hive user object with Aioha metadata
        const newHiveUser: HiveAuthUser = {
          username: userData.username!,
          isAuthenticated: true,
          provider: loginResult?.provider || 'aioha',
          aiohaUserId: userData.id ? String(userData.id) : undefined,
          sessionId: userData.sessionId ? String(userData.sessionId) : undefined,
        };
        setHiveUser(newHiveUser);

        // Fetch full account data in the background
        try {
          const accountData = await fetchUserAccount(userData.username!);
          
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
              displayName: accountData.profile.name || userData.username!,
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
        const aiohaWithUser = aioha as AiohaInstanceWithUser;
        if (aiohaWithUser.logout) {
          await aiohaWithUser.logout();
        }
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

  const updateUser = useCallback((userUpdate: Partial<User>) => {
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
  }, [user]);

  const applyAccountData = useCallback((accountData: UserAccountData) => {
    if (!hiveUser) {
      return;
    }

    // Update hiveUser with account data
    const updatedHiveUser: HiveAuthUser = {
      ...hiveUser,
      username: hiveUser.username,
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
  }, [hiveUser, setHiveUser, updateUser, user]);

  const refreshHiveAccount = useCallback(async () => {
    if (!hiveUser?.username) {
      return;
    }

    try {
      let accountData: UserAccountData | null = null;

      if (typeof window === "undefined") {
        accountData = await fetchUserAccount(hiveUser.username);
      } else {
        const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(hiveUser.username)}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload as { error?: string }).error ||
            `Failed to refresh Hive account: ${response.status}`
          );
        }
        const payload = await response.json() as { account?: UserAccountData };
        if (payload.account) {
          const { account } = payload;
          accountData = {
            ...account,
            createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
            lastPost: account.lastPost ? new Date(account.lastPost as unknown as string) : undefined,
            lastVote: account.lastVote ? new Date(account.lastVote as unknown as string) : undefined,
          } as UserAccountData;
        }
      }

      if (accountData) {
        applyAccountData(accountData);
      }
    } catch (error) {
      console.error("Error refreshing Hive account:", error);
    }
  }, [applyAccountData, hiveUser]);

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
