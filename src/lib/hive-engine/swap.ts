/**
 * HIVE → MEDALS Swap Logic
 *
 * Builds swap operations (fee transfer + deposit HIVE + market buy MEDALS)
 * and calculates swap quotes by walking the sell order book.
 */

import { getOrderBook } from './market';
import { parseQuantity } from './client';
import { MEDALS_CONFIG } from './constants';
import type { SwapQuote, OrderBookEntry } from './types';
import type { HiveOperation } from '@/types/hive-operations';

/** The account that handles HIVE → SWAP.HIVE wrapping */
const DEPOSIT_ACCOUNT = 'honey-swap';
const DEPOSIT_MEMO = 'SWAP.HIVE';

/** Platform swap fee: 0.5% sent to the main sportsblock account */
export const SWAP_FEE_PERCENT = 0.005;
const FEE_RECIPIENT = MEDALS_CONFIG.ACCOUNTS.MAIN;

/** Slippage buffer added on top of worst fill price (0.5%) */
const SLIPPAGE_MULTIPLIER = 1.005;

// ============================================================================
// Swap Quote
// ============================================================================

/**
 * Walk the sell order book to estimate how many MEDALS a given HIVE amount buys.
 *
 * The quote accounts for the 1% platform fee — the user enters a gross HIVE
 * amount, and the quote shows what they receive after the fee is deducted.
 *
 * Price semantics: each ask's `price` is SWAP.HIVE per 1 MEDALS.
 * We spend the net HIVE (after fee) as SWAP.HIVE and accumulate MEDALS.
 */
export async function getSwapQuote(hiveAmount: number): Promise<SwapQuote> {
  if (hiveAmount <= 0) {
    return {
      hiveAmount,
      fee: 0,
      netHive: 0,
      estimatedMedals: 0,
      averagePrice: 0,
      worstPrice: 0,
      priceImpact: 0,
      sufficient: false,
      ordersMatched: 0,
    };
  }

  const fee = Math.floor(hiveAmount * SWAP_FEE_PERCENT * 1000) / 1000; // truncate to 3 decimals
  const netHive = Math.floor((hiveAmount - fee) * 1000) / 1000;

  const orderBook = await getOrderBook(MEDALS_CONFIG.SYMBOL, 200);
  const result = walkSellBook(orderBook.asks, netHive);

  return {
    ...result,
    hiveAmount,
    fee,
    netHive,
  };
}

/**
 * Pure function: walk the sell book and return a partial SwapQuote.
 * Exported for testing.
 */
export function walkSellBook(
  asks: OrderBookEntry[],
  hiveToSpend: number
): Omit<SwapQuote, 'hiveAmount' | 'fee' | 'netHive'> {
  let remainingHive = hiveToSpend;
  let totalMedals = 0;
  let worstPrice = 0;
  let ordersMatched = 0;

  for (const ask of asks) {
    const price = parseQuantity(ask.price);
    const quantity = parseQuantity(ask.quantity);
    if (price <= 0 || quantity <= 0) continue;

    // How much HIVE this order costs fully
    const orderCost = quantity * price;

    if (remainingHive >= orderCost) {
      // Consume entire order
      totalMedals += quantity;
      remainingHive -= orderCost;
      worstPrice = price;
      ordersMatched++;
    } else {
      // Partial fill — buy as many MEDALS as remaining HIVE allows
      const partialMedals = remainingHive / price;
      totalMedals += partialMedals;
      remainingHive = 0;
      worstPrice = price;
      ordersMatched++;
    }

    if (remainingHive <= 0) break;
  }

  const sufficient = remainingHive <= 0;
  const spent = hiveToSpend - remainingHive;
  const averagePrice = totalMedals > 0 ? spent / totalMedals : 0;

  // Price impact: difference between best ask and average fill
  const bestAsk = asks.length > 0 ? parseQuantity(asks[0].price) : 0;
  const priceImpact = bestAsk > 0 ? ((averagePrice - bestAsk) / bestAsk) * 100 : 0;

  return {
    estimatedMedals: totalMedals,
    averagePrice,
    worstPrice,
    priceImpact: Math.max(0, priceImpact),
    sufficient,
    ordersMatched,
  };
}

// ============================================================================
// Swap Operations Builder
// ============================================================================

/**
 * Build the three operations needed for a HIVE → MEDALS swap:
 * 1. transfer 1% fee to sportsblock
 * 2. transfer remaining HIVE to honey-swap (wraps as SWAP.HIVE)
 * 3. custom_json market buy for MEDALS using SWAP.HIVE
 *
 * @param username  Hive account executing the swap
 * @param hiveAmount  Gross HIVE amount (before fee)
 * @param fee  Fee amount in HIVE
 * @param netHive  HIVE amount after fee (deposited to Hive Engine)
 * @param estimatedMedals  Expected MEDALS output (from quote)
 * @param worstPrice  Worst fill price from quote (used for slippage protection)
 */
export function buildSwapOperations(
  username: string,
  hiveAmount: number,
  fee: number,
  netHive: number,
  estimatedMedals: number,
  worstPrice: number
): HiveOperation[] {
  const operations: HiveOperation[] = [];

  // Op 1: Platform fee
  if (fee > 0) {
    operations.push([
      'transfer',
      {
        from: username,
        to: FEE_RECIPIENT,
        amount: `${fee.toFixed(3)} HIVE`,
        memo: 'Sportsblock swap fee',
      },
    ]);
  }

  // Op 2: Deposit HIVE → SWAP.HIVE
  operations.push([
    'transfer',
    {
      from: username,
      to: DEPOSIT_ACCOUNT,
      amount: `${netHive.toFixed(3)} HIVE`,
      memo: DEPOSIT_MEMO,
    },
  ]);

  // Max price with slippage buffer
  const maxPrice = worstPrice * SLIPPAGE_MULTIPLIER;

  // Op 3: Market buy MEDALS with SWAP.HIVE
  operations.push([
    'custom_json',
    {
      id: 'ssc-mainnet-hive',
      required_auths: [username],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'market',
        contractAction: 'buy',
        contractPayload: {
          symbol: MEDALS_CONFIG.SYMBOL,
          quantity: estimatedMedals.toFixed(8),
          price: maxPrice.toFixed(8),
        },
      }),
    },
  ]);

  return operations;
}
