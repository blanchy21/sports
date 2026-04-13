/**
 * Higher or Lower escrow operations — entry fees, buy-backs, prize payouts.
 * Mirrors src/lib/predictions/escrow.ts but with hol-* memo prefixes.
 *
 * Escrow account is shared with predictions/contests (sp-predictions).
 */

import { buildTransferOpFromAmount } from '@/lib/hive-engine/operations';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import { CONTEST_CONFIG } from '@/lib/contests/constants';
import type { CustomJsonOp } from '@/lib/hive-engine/types';

export const HOL_ESCROW_ACCOUNT = CONTEST_CONFIG.ESCROW_ACCOUNT;

export function holEntryMemo(competitionId: string): string {
  return `hol-entry|${competitionId}`;
}

export function holBuyBackMemo(
  competitionId: string,
  entryId: string,
  roundNumber: number
): string {
  return `hol-buyback|${competitionId}|${entryId}|${roundNumber}`;
}

export function buildHolEntryFeeOp(
  username: string,
  amount: number,
  competitionId: string
): CustomJsonOp {
  return buildTransferOpFromAmount(
    username,
    HOL_ESCROW_ACCOUNT,
    amount,
    MEDALS_CONFIG.SYMBOL,
    holEntryMemo(competitionId)
  );
}

export function buildHolBuyBackOp(
  username: string,
  amount: number,
  competitionId: string,
  entryId: string,
  roundNumber: number
): CustomJsonOp {
  return buildTransferOpFromAmount(
    username,
    HOL_ESCROW_ACCOUNT,
    amount,
    MEDALS_CONFIG.SYMBOL,
    holBuyBackMemo(competitionId, entryId, roundNumber)
  );
}
