/**
 * Safe Storage Utilities
 * 
 * Provides safe access to localStorage/sessionStorage that works
 * in both SSR and client-side environments.
 */

/**
 * Check if we're in a browser environment
 */
function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safe localStorage getter
 */
export function getLocalStorage(key: string): string | null {
  if (!isClient()) {
    return null;
  }
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safe localStorage setter
 */
export function setLocalStorage(key: string, value: string): boolean {
  if (!isClient()) {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safe localStorage remover
 */
export function removeLocalStorage(key: string): boolean {
  if (!isClient()) {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safe sessionStorage getter
 */
export function getSessionStorage(key: string): string | null {
  if (!isClient()) {
    return null;
  }
  
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from sessionStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safe sessionStorage setter
 */
export function setSessionStorage(key: string, value: string): boolean {
  if (!isClient()) {
    return false;
  }
  
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to sessionStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safe sessionStorage remover
 */
export function removeSessionStorage(key: string): boolean {
  if (!isClient()) {
    return false;
  }
  
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing sessionStorage key "${key}":`, error);
    return false;
  }
}

