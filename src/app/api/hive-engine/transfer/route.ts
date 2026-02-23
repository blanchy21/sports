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
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createApiHandler, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * POST - Build transfer or delegation operation
 */
export const POST = createApiHandler('/api/hive-engine/transfer', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    // Require authentication
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return apiError('Authentication required', 'UNAUTHORIZED', 401, {
        requestId: ctx.requestId,
      });
    }

    const body = await request.json();
    const { action = 'transfer', from, to, quantity, memo } = body;

    // Verify the authenticated user matches the sender
    if (user.hiveUsername !== from && user.username !== from) {
      return apiError('Cannot build operations for other accounts', 'FORBIDDEN', 403, {
        requestId: ctx.requestId,
      });
    }

    // Validate from account
    if (!from || !isValidAccountName(from)) {
      return apiError('Valid sender account (from) is required', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // Validate to account
    if (!to || !isValidAccountName(to)) {
      return apiError('Valid recipient account (to) is required', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // Validate quantity
    if (!quantity || !isValidQuantity(quantity)) {
      return apiError('Valid quantity is required (e.g., "100.000")', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // Check sender's balance
    const senderBalance = await getMedalsBalance(from);
    const requestedAmount = parseQuantity(quantity);

    switch (action) {
      case 'transfer': {
        // Check liquid balance for transfers
        if (!senderBalance || senderBalance.liquid < requestedAmount) {
          return apiError('Insufficient balance', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
            details: {
              available: senderBalance?.liquid.toFixed(3) || '0.000',
              requested: quantity,
            },
          });
        }

        // Cannot transfer to self
        if (from === to) {
          return apiError('Cannot transfer to yourself', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        const operation = buildTransferOp(from, to, quantity, MEDALS_CONFIG.SYMBOL, memo);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
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
          return apiError('Insufficient staked balance', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
            details: {
              available: senderBalance?.staked.toFixed(3) || '0.000',
              requested: quantity,
            },
          });
        }

        // Cannot delegate to self
        if (from === to) {
          return apiError('Cannot delegate to yourself', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        const operation = buildDelegateOp(from, to, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
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
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
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
        return apiError(
          'Invalid action. Use: transfer, delegate, or undelegate',
          'VALIDATION_ERROR',
          400,
          { requestId: ctx.requestId }
        );
    }
  });
});
