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
  hasMounted: boolean;
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


const AUTH_STORAGE_KEY = "authState";

// Session expires after 30 minutes of inactivity
const SESSION_DURATION_MS = 30 * 60 * 1000;

/**
 * Check if a session is expired based on loginAt timestamp
 */
function isSessionExpired(loginAt: number | undefined): boolean {
  if (!loginAt) return true;
  return Date.now() - loginAt > SESSION_DURATION_MS;
}

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
  loginAt: loginAtToPersist,
}: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt?: number;
}) => {
  // Only persist on client-side
  if (typeof window === 'undefined') {
    return;
  }
  
  const sanitizedState = {
    user: userToPersist,
    authType: authTypeToPersist,
    hiveUser: sanitizeHiveUserForStorage(hiveUserToPersist),
    // Use existing loginAt or create new timestamp
    loginAt: loginAtToPersist ?? Date.now(),
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

// Combined auth state to batch updates and reduce re-renders
interface AuthStateInternal {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt: number | undefined;
  isLoading: boolean;
  isClient: boolean;
  hasMounted: boolean;
}

const initialAuthState: AuthStateInternal = {
  user: null,
  authType: "guest",
  hiveUser: null,
  loginAt: undefined,
  isLoading: true,
  isClient: false,
  hasMounted: false,
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Single state object to batch all auth-related updates
  const [authState, setAuthState] = useState<AuthStateInternal>(initialAuthState);
  const { aioha, isInitialized } = useAioha();

  // Track if we need to refresh Hive account after mount
  const needsHiveRefresh = React.useRef(false);

  // Destructure for easier access (these are derived, not separate state)
  const { user, authType, hiveUser, isLoading, isClient, hasMounted } = authState;

  // Helper to update auth state (batches all updates into single render)
  const updateAuthState = useCallback((updates: Partial<AuthStateInternal>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // Wrapper for setHiveUser to maintain API compatibility
  const setHiveUser = useCallback((newHiveUser: HiveAuthUser | null) => {
    updateAuthState({ hiveUser: newHiveUser });
  }, [updateAuthState]);

  useEffect(() => {
    // Use requestAnimationFrame to batch state updates after paint
    // This prevents visible flash by deferring state changes
    requestAnimationFrame(() => {
      // Check for existing auth state in localStorage with validation
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

      if (savedAuth) {
        const validatedState = parseAuthState(savedAuth);
        if (validatedState) {
          const { user: savedUser, authType: savedAuthType, hiveUser: savedHiveUser, loginAt: savedLoginAt } = validatedState;

          // Check if session has expired (30 minutes of inactivity)
          if (isSessionExpired(savedLoginAt)) {
            // Session expired - clear auth state
            localStorage.removeItem(AUTH_STORAGE_KEY);
            console.log("Session expired after 30 minutes of inactivity");
            // Single state update for expired session
            updateAuthState({
              isClient: true,
              hasMounted: true,
              isLoading: false,
            });
            return;
          }

          // Session is still valid - restore state in a SINGLE update
          const restoredUser = savedUser ? {
            ...savedUser,
            isHiveAuth: savedUser.isHiveAuth ?? false,
          } as User : null;

          const restoredHiveUser = savedHiveUser ? {
            ...savedHiveUser,
            isAuthenticated: savedHiveUser.isAuthenticated ?? true,
          } as HiveAuthUser : null;

          // Mark that we need to refresh Hive account if profile data is missing
          if (savedAuthType === "hive" && savedUser && !savedUser.hiveProfile) {
            needsHiveRefresh.current = true;
          }

          // Refresh loginAt to extend the session (user is active)
          const refreshedLoginAt = Date.now();

          // SINGLE state update with all restored values
          updateAuthState({
            user: restoredUser,
            authType: savedAuthType,
            hiveUser: restoredHiveUser,
            loginAt: refreshedLoginAt,
            isClient: true,
            hasMounted: true,
            isLoading: false,
          });

          // Persist the refreshed loginAt to localStorage
          persistAuthState({
            user: restoredUser,
            authType: savedAuthType,
            hiveUser: restoredHiveUser,
            loginAt: refreshedLoginAt,
          });
        } else {
          // Invalid auth state - clear corrupted data
          localStorage.removeItem(AUTH_STORAGE_KEY);
          console.warn("Cleared invalid auth state from localStorage");
          updateAuthState({
            isClient: true,
            hasMounted: true,
            isLoading: false,
          });
        }
      } else {
        // No saved auth - just mark as loaded
        updateAuthState({
          isClient: true,
          hasMounted: true,
          isLoading: false,
        });
      }
    });
  }, [updateAuthState]);

  // Separate effect for Hive account refresh to avoid calling before it's defined
  useEffect(() => {
    if (!isLoading && needsHiveRefresh.current) {
      needsHiveRefresh.current = false;
      refreshHiveAccount();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((newUser: User, newAuthType: AuthType) => {
    const now = Date.now();

    // Single state update
    updateAuthState({
      user: newUser,
      authType: newAuthType,
      loginAt: now,
    });

    // Save to localStorage with new login timestamp
    persistAuthState({
      user: newUser,
      authType: newAuthType,
      hiveUser: authState.hiveUser,
      loginAt: now,
    });
  }, [updateAuthState, authState.hiveUser]);

  const loginWithFirebase = useCallback((authUser: AuthUser) => {
    const now = Date.now();
    const newUser: User = {
      id: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName,
      avatar: authUser.avatar,
      isHiveAuth: authUser.isHiveUser,
      hiveUsername: authUser.hiveUsername,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    const newAuthType = authUser.isHiveUser ? "hive" : "soft";
    const newHiveUser = authUser.isHiveUser
      ? { username: authUser.hiveUsername!, isAuthenticated: true }
      : null;

    // Single state update
    updateAuthState({
      user: newUser,
      authType: newAuthType,
      hiveUser: newHiveUser,
      loginAt: now,
    });

    // Save to localStorage
    persistAuthState({
      user: newUser,
      authType: newAuthType,
      hiveUser: newHiveUser,
      loginAt: now,
    });
  }, [updateAuthState]);

  const loginWithHiveUser = useCallback(async (hiveUsername: string) => {
    try {
      const now = Date.now();
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

      // Create Hive user object
      const newHiveUser: HiveAuthUser = {
        username: hiveUsername,
        isAuthenticated: true,
      };

      // SINGLE state update for immediate UI responsiveness
      updateAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
      });

      persistAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
      });

      // PERFORMANCE: Defer profile fetch to background - don't block login/redirect
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch account: ${response.status}`);
          }
          const result = await response.json();
          const accountData = result.success ? result.account as UserAccountData : null;

          if (accountData) {
            // Update hiveUser with account data
            const updatedHiveUser = {
              ...newHiveUser,
              account: accountData as unknown as HiveAccount,
            };

            // Update the main user object with Hive profile data
            const updatedUser = {
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
              displayName: accountData.profile.name || hiveUsername,
              bio: accountData.profile.about,
              createdAt: accountData.createdAt,
            };

            // SINGLE state update for profile data
            updateAuthState({
              user: updatedUser,
              hiveUser: updatedHiveUser,
            });

            // Save updated state to localStorage (keep same loginAt)
            persistAuthState({
              user: updatedUser,
              authType: "hive",
              hiveUser: updatedHiveUser,
              loginAt: now,
            });
          }
        } catch (profileError) {
          console.error("Error fetching Hive account data:", profileError);
          // Keep the basic user even if profile loading fails
        }
      }, 0);
    } catch (error) {
      console.error("Error logging in with Hive user:", error);
      // Keep the basic user even if profile loading fails
    }
  }, [updateAuthState]);

  const loginWithAioha = useCallback(async (loginResult?: AiohaLoginResult) => {
    if (!isInitialized || !aioha) {
      throw new Error("Aioha authentication is not available. Please refresh the page and try again.");
    }

    try {
      const aiohaInstance = aioha as AiohaInstance;
      let extracted: ExtractedUserData | null = null;

      // Step 1: Try to extract from login result
      if (loginResult) {
        extracted = extractFromLoginResult(loginResult);
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
      const now = Date.now();

      // Create user objects
      const basicUser: User = {
        id: username,
        username: username,
        displayName: username,
        isHiveAuth: true,
        hiveUsername: username,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newHiveUser: HiveAuthUser = {
        username: username,
        isAuthenticated: true,
        provider: loginResult?.provider ?? 'aioha',
        sessionId: sessionId,
      };

      // SINGLE state update for immediate UI responsiveness
      updateAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
      });

      persistAuthState({
        user: basicUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
      });

      // PERFORMANCE: Defer profile fetch to background
      setTimeout(async () => {
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

            // SINGLE state update for profile data
            updateAuthState({
              user: updatedUser,
              hiveUser: updatedHiveUser,
            });

            persistAuthState({
              user: updatedUser,
              authType: "hive",
              hiveUser: updatedHiveUser,
              loginAt: now,
            });
          }
        } catch (profileError) {
          console.error("Error fetching Hive account data:", profileError);
        }
      }, 0);
    } catch (error) {
      console.error("Error processing Aioha authentication:", error);
      throw error;
    }
  }, [aioha, isInitialized, updateAuthState]);

  const logout = useCallback(async () => {
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

    // SINGLE state update for logout
    updateAuthState({
      user: null,
      authType: "guest",
      hiveUser: null,
      loginAt: undefined,
    });

    // Only remove from localStorage on client-side
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (error) {
        console.error('Error removing auth state from localStorage:', error);
      }
    }
  }, [aioha, authType, hiveUser?.provider, updateAuthState]);

  const upgradeToHive = useCallback(async (hiveUsername: string) => {
    if (!user || authType !== "soft") {
      throw new Error("User must be logged in with a soft account to upgrade");
    }

    try {
      const now = Date.now();
      // Update Firebase profile to mark as Hive user
      await FirebaseAuth.upgradeToHive(user.id, hiveUsername);

      // Update local user state
      const updatedUser = {
        ...user,
        isHiveAuth: true,
        hiveUsername: hiveUsername,
      };

      // Create Hive user object
      const newHiveUser: HiveAuthUser = {
        username: hiveUsername,
        isAuthenticated: true,
      };

      // SINGLE state update
      updateAuthState({
        user: updatedUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
      });

      persistAuthState({
        user: updatedUser,
        authType: "hive",
        hiveUser: newHiveUser,
        loginAt: now,
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

          // SINGLE state update for profile data
          updateAuthState({
            user: userWithHiveData,
            hiveUser: updatedHiveUser,
          });

          persistAuthState({
            user: userWithHiveData,
            authType: "hive",
            hiveUser: updatedHiveUser,
            loginAt: now,
          });
        }
      } catch (profileError) {
        console.error("Error fetching Hive account data:", profileError);
      }
    } catch (error) {
      console.error("Error upgrading to Hive account:", error);
      throw error;
    }
  }, [authType, updateAuthState, user]);

  const updateUser = useCallback((userUpdate: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userUpdate };
      const now = Date.now();

      // SINGLE state update
      updateAuthState({
        user: updatedUser,
        loginAt: now,
      });

      persistAuthState({
        user: updatedUser,
        authType,
        hiveUser,
        loginAt: now,
      });
    }
  }, [authType, hiveUser, updateAuthState, user]);

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

    // Also update the main user object with Hive profile data
    if (user) {
      const updatedUser = {
        ...user,
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

      const now = Date.now();

      // SINGLE state update for both user and hiveUser
      updateAuthState({
        user: updatedUser,
        hiveUser: updatedHiveUser,
        loginAt: now,
      });

      persistAuthState({
        user: updatedUser,
        authType,
        hiveUser: updatedHiveUser,
        loginAt: now,
      });
    } else {
      // Only update hiveUser if no user
      updateAuthState({ hiveUser: updatedHiveUser });
    }
  }, [authType, hiveUser, updateAuthState, user]);

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
          // Handle both Date objects and ISO strings from JSON
          lastPost: account.lastPost ? new Date(String(account.lastPost)) : undefined,
          lastVote: account.lastVote ? new Date(String(account.lastVote)) : undefined,
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
    hasMounted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
