import { AuthType, User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import { logger } from '@/lib/logger';
import { AuthStateInternal } from './auth-types';

// ============================================================================
// Reducer Actions - Explicit state transitions for debugging and testing
// ============================================================================

export type AuthAction =
  | {
      type: 'RESTORE_SESSION';
      payload: {
        user: User | null;
        authType: AuthType;
        hiveUser: HiveAuthUser | null;
        loginAt: number;
      };
    }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'INVALID_SESSION' }
  | { type: 'CLIENT_MOUNTED' }
  | {
      type: 'LOGIN';
      payload: {
        user: User;
        authType: AuthType;
        hiveUser: HiveAuthUser | null;
        loginAt: number;
      };
    }
  | { type: 'LOGIN_PROFILE_LOADED'; payload: { user: User; hiveUser: HiveAuthUser } }
  | { type: 'LOGIN_PROFILE_FAILED' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: { user: User; loginAt: number } }
  | { type: 'UPDATE_HIVE_USER'; payload: HiveAuthUser | null }
  | {
      type: 'REFRESH_ACCOUNT';
      payload: { user: User; hiveUser: HiveAuthUser; loginAt: number };
    };

// ============================================================================
// Reducer Function
// ============================================================================

export function authReducer(state: AuthStateInternal, action: AuthAction): AuthStateInternal {
  // Enable action logging in development for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug(action.type, 'AuthReducer', 'payload' in action ? action.payload : undefined);
  }

  switch (action.type) {
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        authType: action.payload.authType,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
        isClient: true,
        hasMounted: true,
        isLoading: false,
        profileLoadFailed: false,
      };

    case 'SESSION_EXPIRED':
    case 'INVALID_SESSION':
      return {
        ...state,
        isClient: true,
        hasMounted: true,
        isLoading: false,
      };

    case 'CLIENT_MOUNTED':
      return {
        ...state,
        isClient: true,
        hasMounted: true,
        isLoading: false,
      };

    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        authType: action.payload.authType,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
        profileLoadFailed: false,
      };

    case 'LOGIN_PROFILE_LOADED':
      return {
        ...state,
        user: action.payload.user,
        hiveUser: action.payload.hiveUser,
      };

    case 'LOGIN_PROFILE_FAILED':
      return {
        ...state,
        profileLoadFailed: true,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        authType: 'guest',
        hiveUser: null,
        loginAt: undefined,
        profileLoadFailed: false,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload.user,
        loginAt: action.payload.loginAt,
      };

    case 'UPDATE_HIVE_USER':
      return {
        ...state,
        hiveUser: action.payload,
      };

    case 'REFRESH_ACCOUNT':
      return {
        ...state,
        user: action.payload.user,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
      };

    default:
      return state;
  }
}
