import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Format date in a timezone-aware way to prevent hydration mismatches
 * Uses UTC to ensure consistent server/client rendering
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
  } else {
    // Use UTC to prevent hydration mismatches
    return d.toLocaleDateString('en-US', { 
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Format time in a timezone-aware way to prevent hydration mismatches
 * Uses user's local timezone but formats consistently
 */
export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  // Use consistent formatting to prevent hydration mismatches
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date and time together in a timezone-aware way
 */
export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatReadTime = (wordCount: number): string => {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Format USD currency values
 * @param amount - Amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted USD string
 */
export const formatUSD = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format cryptocurrency values
 * @param amount - Amount to format
 * @param symbol - Currency symbol (e.g., 'HIVE', 'HBD', 'BTC')
 * @param decimals - Number of decimal places
 * @returns Formatted crypto string
 */
export const formatCrypto = (amount: number, symbol: string, decimals: number = 3): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount) + ` ${symbol}`;
};

/**
 * Format percentage values
 * @param value - Percentage value (e.g., 15.5 for 15.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + '%';
};

/**
 * Format large numbers with K, M, B suffixes
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export const formatLargeNumber = (num: number, decimals: number = 1): string => {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  } else {
    return num.toFixed(decimals);
  }
};

/**
 * Calculate USD value of crypto amount
 * @param amount - Crypto amount
 * @param pricePerUnit - Price per unit in USD
 * @returns USD value
 */
export const calculateUSDValue = (amount: number, pricePerUnit: number): number => {
  return amount * pricePerUnit;
};

/**
 * Format crypto amount with USD equivalent
 * @param amount - Crypto amount
 * @param symbol - Currency symbol
 * @param pricePerUnit - Price per unit in USD
 * @param cryptoDecimals - Decimal places for crypto (default: 3)
 * @param usdDecimals - Decimal places for USD (default: 2)
 * @returns Formatted string with crypto and USD values
 */
export const formatCryptoWithUSD = (
  amount: number, 
  symbol: string, 
  pricePerUnit: number, 
  cryptoDecimals: number = 3,
  usdDecimals: number = 2
): string => {
  const cryptoFormatted = formatCrypto(amount, symbol, cryptoDecimals);
  const usdValue = calculateUSDValue(amount, pricePerUnit);
  const usdFormatted = formatUSD(usdValue, usdDecimals);
  return `${cryptoFormatted} (${usdFormatted})`;
};
