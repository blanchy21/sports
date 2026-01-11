"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthState, AuthType, User } from "@/types";
import { HiveAuthUser, HiveAccount } from "@/lib/shared/types";
import type { UserAccountData } from "@/lib/hive-workerbee/account";
import { useAioha } from "@/contexts/AiohaProvider";
import { AuthUser, FirebaseAuth } from "@/lib/firebase/auth";
import { parseAuthState } from "@/lib/validation/auth-schema";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extracted user data from Aioha authentication
 */
interface ExtractedUserData {
  username: string;
  sessionId?: string;
}

/**
 * Aioha login result - simplified type covering common response shapes
 */
interface AiohaLoginResult {
  username?: string;
  name?: string;
  id?: string;
  session?: string;
  session_id?: string;
  sessionId?: string;
  provider?: string;
  errorCode?: number;
  user?: {
    username?: string;
    name?: string;
    session?: string;
    sessionId?: string;
    session_id?: string;
  };
  account?: {
    name?: string;
    username?: string;
  };
  data?: { username?: string; name?: string };
  result?: { username?: string; name?: string };
  auth?: { username?: string; name?: string };
  profile?: { username?: string; name?: string };
  identity?: { username?: string; name?: string };
  accountData?: { username?: string; name?: string };
}

/**
 * Aioha instance interface - the SDK object
 */
interface AiohaInstance {
  user?: {
    username?: string;
    sessionId?: string;
    session_id?: string;
  };
  currentUser?: {
    username?: string;
    sessionId?: string;
    session_id?: string;
  };
  username?: string;
  sessionId?: string;
  session_id?: string;
  account?: { name?: string };
  currentProvider?: string;
  providers?: Record<string, AiohaProvider>;
  state?: { user?: { username?: string; sessionId?: string; session_id?: string } };
  _state?: { user?: { username?: string; sessionId?: string; session_id?: string } };
  getUser?: () => Promise<{ username?: string; id?: string; sessionId?: string }>;
  logout?: () => Promise<void>;
}

interface AiohaProvider {
  user?: { username?: string; sessionId?: string; session_id?: string };
  username?: string;
  sessionId?: string;
  session_id?: string;
  account?: { name?: string };
}

/**
 * Auth context value - exported for consumers
 */
export interface AuthContextValue extends AuthState {
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
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely get a trimmed string value
 */
function getTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Safely get a string property from an object
 */
function getStringProp(obj: unknown, key: string): string | undefined {
  if (typeof obj === 'object' && obj !== null) {
    return getTrimmedString((obj as Record<string, unknown>)[key]);
  }
  return undefined;
}

/**
 * Extract session ID from various property names
 */
function extractSessionId(obj: unknown): string | undefined {
  return getStringProp(obj, 'sessionId')
    ?? getStringProp(obj, 'session_id')
    ?? getStringProp(obj, 'session');
}

/**
 * Extract username from an Aioha login result
 */
function extractFromLoginResult(result: AiohaLoginResult): ExtractedUserData | null {
  // Try direct properties first
  const directUsername = getTrimmedString(result.username) ?? getTrimmedString(result.name);
  if (directUsername) {
    return { username: directUsername, sessionId: extractSessionId(result) };
  }

  // Try nested user object
  if (result.user) {
    const userUsername = getTrimmedString(result.user.username) ?? getTrimmedString(result.user.name);
    if (userUsername) {
      return { username: userUsername, sessionId: extractSessionId(result.user) };
    }
  }

  // Try account object
  if (result.account) {
    const accountUsername = getTrimmedString(result.account.name) ?? getTrimmedString(result.account.username);
    if (accountUsername) {
      return { username: accountUsername, sessionId: extractSessionId(result) };
    }
  }

  // Try other common nested structures
  const nestedSources = [result.data, result.result, result.auth, result.profile, result.identity, result.accountData];
  for (const source of nestedSources) {
    if (source) {
      const username = getTrimmedString(source.username) ?? getTrimmedString(source.name);
      if (username) {
        return { username, sessionId: extractSessionId(result) };
      }
    }
  }

  return null;
}

/**
 * Extract username from Aioha instance
 */
function extractFromAiohaInstance(aioha: AiohaInstance): ExtractedUserData | null {
  // Try user object
  if (aioha.user?.username) {
    return { username: aioha.user.username, sessionId: extractSessionId(aioha.user) };
  }

  // Try currentUser
  if (aioha.currentUser?.username) {
    return { username: aioha.currentUser.username, sessionId: extractSessionId(aioha.currentUser) };
  }

  // Try direct username
  if (aioha.username) {
    return { username: aioha.username, sessionId: extractSessionId(aioha) };
  }

  // Try account
  if (aioha.account?.name) {
    return { username: aioha.account.name, sessionId: extractSessionId(aioha) };
  }

  // Try state objects
  const stateUser = aioha.state?.user ?? aioha._state?.user;
  if (stateUser?.username) {
    return { username: stateUser.username, sessionId: extractSessionId(stateUser) };
  }

  return null;
}

/**
 * Extract username from provider instance
 */
function extractFromProvider(provider: AiohaProvider): ExtractedUserData | null {
  if (provider.user?.username) {
    return { username: provider.user.username, sessionId: extractSessionId(provider.user) };
  }
  if (provider.username) {
    return { username: provider.username, sessionId: extractSessionId(provider) };
  }
  if (provider.account?.name) {
    return { username: provider.account.name, sessionId: extractSessionId(provider) };
  }
  return null;
}


const AUTH_STORAGE_KEY = "authState";

export const sanitizeHiveUserForStorage = (hiveUser: HiveAuthUser | null): HiveAuthUser | null => {
  if (!hiveUser) {
    return null;
  }

  const sanitizedHiveUser: HiveAuthUser = { ...hiveUser };
  delete sanitizedHiveUser.sessionId;
  delete sanitizedHiveUser.aiohaUserId;
  return sanitizedHiveUser;
};

const persistAuthState = ({
  user: userToPersist,
  authType: authTypeToPersist,
  hiveUser: hiveUserToPersist,
}: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
}) => {
  // Only persist on client-side
  if (typeof window === 'undefined') {
    return;
  }
  
  const sanitizedState = {
    user: userToPersist,
    authType: authTypeToPersist,
    hiveUser: sanitizeHiveUserForStorage(hiveUserToPersist),
  };
  
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitizedState));
  } catch (error) {
    console.error('Error persisting auth state:', error);
  }
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    
    // Check for existing auth state in localStorage with validation
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      const validatedState = parseAuthState(savedAuth);
      if (validatedState) {
        const { user: savedUser, authType: savedAuthType, hiveUser: savedHiveUser } = validatedState;
        // Cast validated user - schema ensures required fields exist, defaults handle optional ones
        if (savedUser) {
          setUser({
            ...savedUser,
            isHiveAuth: savedUser.isHiveAuth ?? false,
          } as User);
        }
        setAuthType(savedAuthType);
        if (savedHiveUser) {
          setHiveUser({
            ...savedHiveUser,
            isAuthenticated: savedHiveUser.isAuthenticated ?? true,
          } as HiveAuthUser);
          // If user is authenticated with Hive but doesn't have profile data, refresh it
          if (savedAuthType === "hive" && savedUser && !savedUser.hiveProfile) {
            // Use setTimeout to avoid calling refreshHiveAccount before it's defined
            setTimeout(() => {
              refreshHiveAccount();
            }, 100);
          }
        }
      } else {
        // Invalid auth state - clear corrupted data
        localStorage.removeItem(AUTH_STORAGE_KEY);
        console.warn("Cleared invalid auth state from localStorage");
      }
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (newUser: User, newAuthType: AuthType) => {
    setUser(newUser);
    setAuthType(newAuthType);
    
    // Save to localStorage
    persistAuthState({
      user: newUser,
      authType: newAuthType,
      hiveUser,
    });
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
    persistAuthState({
      user,
      authType: authUser.isHiveUser ? "hive" : "soft",
      hiveUser: authUser.isHiveUser
        ? {
            username: authUser.hiveUsername!,
            isAuthenticated: true,
          }
        : null,
    });
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

      persistAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
      });

      // Fetch full account data in the background
      console.log("Fetching Hive account data for:", hiveUsername);
      try {
        const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch account: ${response.status}`);
        }
        const result = await response.json();
        const accountData = result.success ? result.account as UserAccountData : null;
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
          persistAuthState({
            user: updatedUser,
            authType: "hive",
            hiveUser: updatedHiveUser,
          });
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
    if (!isInitialized || !aioha) {
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    try {
      const aiohaInstance = aioha as AiohaInstance;
      let extracted: ExtractedUserData | null = null;

      // Step 1: Try to extract from login result
      if (loginResult) {
        // Handle "already logged in" case (errorCode 4901)
        if (loginResult.errorCode === 4901) {
          const currentProvider = aiohaInstance.currentProvider;
          if (currentProvider && aiohaInstance.providers?.[currentProvider]) {
            extracted = extractFromProvider(aiohaInstance.providers[currentProvider]);
          }
        } else {
          extracted = extractFromLoginResult(loginResult);
        }
      }

      // Step 2: Try to extract from Aioha instance
      if (!extracted) {
        extracted = extractFromAiohaInstance(aiohaInstance);
      }

      // Step 3: Try with retries (Aioha may need time to process)
      if (!extracted && loginResult) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          extracted = extractFromAiohaInstance(aiohaInstance);
          if (extracted) break;
        }
      }

      // Step 4: Try getUser method if available
      if (!extracted && typeof aiohaInstance.getUser === 'function') {
        try {
          const getUserResult = await aiohaInstance.getUser();
          if (getUserResult?.username) {
            extracted = { username: getUserResult.username, sessionId: getUserResult.sessionId };
          }
        } catch {
          // getUser failed, continue to next fallback
        }
      }

      // Step 5: Try localStorage fallback
      if (!extracted && typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            if (parsed.hiveUser?.username) {
              extracted = { username: parsed.hiveUser.username };
            }
          } catch {
            // localStorage parse failed
          }
        }
      }

      // If we still have nothing, throw
      if (!extracted) {
        throw new Error("Unable to determine username from Aioha authentication. Please try again.");
      }

      const { username, sessionId } = extracted;

      // Create and set user
      const basicUser: User = {
        id: username,
        username: username,
        displayName: username,
        isHiveAuth: true,
        hiveUsername: username,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setUser(basicUser);
      setAuthType("hive");

      const newHiveUser: HiveAuthUser = {
        username: username,
        isAuthenticated: true,
        provider: loginResult?.provider ?? 'aioha',
        sessionId: sessionId,
      };
      setHiveUser(newHiveUser);

      persistAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
      });

      // Fetch full account data in background
      try {
        const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(username)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch account: ${response.status}`);
        }
        const result = await response.json();
        const accountData = result.success ? result.account as UserAccountData : null;

        if (accountData) {
          const updatedHiveUser: HiveAuthUser = {
            ...newHiveUser,
            account: accountData as unknown as HiveAccount,
          };
          setHiveUser(updatedHiveUser);

          const updatedUser: User = {
            ...basicUser,
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
            avatar: accountData.profile.profileImage,
            displayName: accountData.profile.name ?? username,
            bio: accountData.profile.about,
            createdAt: accountData.createdAt,
          };
          setUser(updatedUser);

          persistAuthState({
            user: updatedUser,
            authType: "hive",
            hiveUser: updatedHiveUser,
          });
        }
      } catch (profileError) {
        console.error("Error fetching Hive account data:", profileError);
        // Keep basic user if profile loading fails
      }
    } catch (error) {
      console.error("Error processing Aioha authentication:", error);
      throw error;
    }
  };

  const logout = async () => {
    // Logout from Aioha if user was authenticated via Aioha
    if (hiveUser?.provider && aioha) {
      try {
        const aiohaInstance = aioha as AiohaInstance;
        if (aiohaInstance.logout) {
          await aiohaInstance.logout();
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
    
    // Only remove from localStorage on client-side
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (error) {
        console.error('Error removing auth state from localStorage:', error);
      }
    }
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

      persistAuthState({
        user: updatedUser,
        authType: "hive",
        hiveUser: newHiveUser,
      });

      // Fetch Hive account data
      try {
        const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch account: ${response.status}`);
        }
        const result = await response.json();
        const accountData = result.success ? result.account as UserAccountData : null;
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

          persistAuthState({
            user: userWithHiveData,
            authType: "hive",
            hiveUser: updatedHiveUser,
          });
        }
      } catch (profileError) {
        console.error("Error fetching Hive account data:", profileError);
        // Keep the basic user even if profile loading fails
      }

    } catch (error) {
      console.error("Error upgrading to Hive account:", error);
      throw error;
    }
  };

  const updateUser = useCallback((userUpdate: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userUpdate };
      setUser(updatedUser);

      persistAuthState({
        user: updatedUser,
        authType,
        hiveUser,
      });
    }
  }, [authType, hiveUser, user]);

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

      persistAuthState({
        user: updatedUser,
        authType,
        hiveUser: updatedHiveUser,
      });
    }
  }, [authType, hiveUser, setHiveUser, updateUser, user]);

  const refreshHiveAccount = useCallback(async () => {
    if (!hiveUser?.username) {
      return;
    }

    try {
      let accountData: UserAccountData | null = null;

      // Always use API route since this is a client component
      const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(hiveUser.username)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string }).error ||
          `Failed to refresh Hive account: ${response.status}`
        );
      }
      const result = await response.json() as { success?: boolean; account?: UserAccountData };
      if (result.success && result.account) {
        const { account } = result;
        accountData = {
          ...account,
          createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
          lastPost: account.lastPost ? new Date(account.lastPost as unknown as string) : undefined,
          lastVote: account.lastVote ? new Date(account.lastVote as unknown as string) : undefined,
        } as UserAccountData;
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
