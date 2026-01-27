/**
 * Cryptocurrency price-related type definitions
 */

export interface CryptoPriceData {
  bitcoin: {
    usd: number;
    usd_24h_change?: number;
    market_cap?: number;
  };
  ethereum: {
    usd: number;
    usd_24h_change?: number;
    market_cap?: number;
  };
  hive: {
    usd: number;
    usd_24h_change?: number;
  };
  hive_dollar: {
    usd: number;
    usd_24h_change?: number;
  };
}

export interface PriceContextType {
  bitcoinPrice: number | null;
  ethereumPrice: number | null;
  hivePrice: number | null;
  hbdPrice: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshPrices: () => Promise<void>;
}
