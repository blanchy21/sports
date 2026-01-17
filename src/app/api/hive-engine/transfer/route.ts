/**
 * MEDALS Transfer API Route
 *
 * POST /api/hive-engine/transfer
 *   Builds a transfer operation for signing
 *   Body: { from: "sender", to: "recipient", quantity: "100.000", memo?: "optional" }
 *
 * Also supports delegation operations:
 *   Body: { action: "delegate" | "undelegate", from: "sender", to: "recipient", quantity: "100.000" }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildTransferOp,
  buildDelegateOp,
  buildUndelegateOp,
  validateOperation,
} from '@/lib/hive-engine/operations';
import { getMedalsBalance } from '@/lib/hive-engine/tokens';
import { isValidAccountName, isValidQuantity, parseQuantity } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

/**
 * POST - Build transfer or delegation operation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'transfer', from, to, quantity, memo } = body;

    // Validate from account
    if (!from || !isValidAccountName(from)) {
      return NextResponse.json(
        { error: 'Valid sender account (from) is required' },
        { status: 400 }
      );
    }

    // Validate to account
    if (!to || !isValidAccountName(to)) {
      return NextResponse.json(
        { error: 'Valid recipient account (to) is required' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (!quantity || !isValidQuantity(quantity)) {
      return NextResponse.json(
        { error: 'Valid quantity is required (e.g., "100.000")' },
        { status: 400 }
      );
    }

    // Check sender's balance
    const senderBalance = await getMedalsBalance(from);
    const requestedAmount = parseQuantity(quantity);

    switch (action) {
      case 'transfer': {
        // Check liquid balance for transfers
        if (!senderBalance || senderBalance.liquid < requestedAmount) {
          return NextResponse.json(
            {
              error: 'Insufficient balance',
              available: senderBalance?.liquid.toFixed(3) || '0.000',
              requested: quantity,
            },
            { status: 400 }
          );
        }

        // Cannot transfer to self
        if (from === to) {
          return NextResponse.json(
            { error: 'Cannot transfer to yourself' },
            { status: 400 }
          );
        }

        const operation = buildTransferOp(from, to, quantity, MEDALS_CONFIG.SYMBOL, memo);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'transfer',
          operation,
          message: `Transfer ${quantity} ${MEDALS_CONFIG.SYMBOL} to @${to}`,
          details: {
            from,
            to,
            quantity,
            symbol: MEDALS_CONFIG.SYMBOL,
            memo: memo || null,
          },
        });
      }

      case 'delegate': {
        // Check staked balance for delegations
        if (!senderBalance || senderBalance.staked < requestedAmount) {
          return NextResponse.json(
            {
              error: 'Insufficient staked balance',
              available: senderBalance?.staked.toFixed(3) || '0.000',
              requested: quantity,
            },
            { status: 400 }
          );
        }

        // Cannot delegate to self
        if (from === to) {
          return NextResponse.json(
            { error: 'Cannot delegate to yourself' },
            { status: 400 }
          );
        }

        const operation = buildDelegateOp(from, to, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'delegate',
          operation,
          message: `Delegate ${quantity} ${MEDALS_CONFIG.SYMBOL} to @${to}`,
          details: {
            from,
            to,
            quantity,
            symbol: MEDALS_CONFIG.SYMBOL,
          },
        });
      }

      case 'undelegate': {
        // For undelegation, 'to' is actually the account we're undelegating FROM
        // The operation will return tokens to 'from' (the delegator)
        const operation = buildUndelegateOp(from, to, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'undelegate',
          operation,
          message: `Undelegate ${quantity} ${MEDALS_CONFIG.SYMBOL} from @${to}`,
          details: {
            from,
            undelegateFrom: to,
            quantity,
            symbol: MEDALS_CONFIG.SYMBOL,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: transfer, delegate, or undelegate' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Error building transfer operation:', error);
    return NextResponse.json(
      {
        error: 'Failed to build operation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
