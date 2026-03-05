import { prisma } from '@/lib/db/prisma';
import { PREDICTION_CONFIG } from './constants';
import { logger } from '@/lib/logger';
import type { Prediction } from '@/generated/prisma/client';

interface ProposalDetails {
  action: 'settle' | 'void';
  outcomeLabel?: string;
  reason?: string;
}

/**
 * Notify all admins (except the proposer) about a new settlement/void proposal.
 */
export async function notifyAdminsOfProposal(
  prediction: Prediction,
  proposedBy: string,
  details: ProposalDetails
): Promise<void> {
  const otherAdmins = PREDICTION_CONFIG.ADMIN_ACCOUNTS.filter((a) => a !== proposedBy);
  if (otherAdmins.length === 0) return;

  // Look up Profile records for admins (by username or hiveUsername)
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { username: { in: [...otherAdmins] } },
        { hiveUsername: { in: [...otherAdmins] } },
      ],
    },
    select: { id: true, username: true, hiveUsername: true },
  });

  if (profiles.length === 0) {
    logger.info('No admin profiles found for proposal notification', 'Predictions', {
      otherAdmins,
    });
    return;
  }

  const actionText = details.action === 'settle'
    ? `settle with outcome "${details.outcomeLabel}"`
    : `void (reason: ${details.reason})`;

  await prisma.notification.createMany({
    data: profiles.map((profile) => ({
      recipientId: profile.id,
      type: 'system',
      title: 'Prediction Approval Needed',
      message: `@${proposedBy} proposed to ${actionText} the prediction "${prediction.title}". Review and approve or reject.`,
      sourceUsername: proposedBy,
      data: { predictionId: prediction.id, action: details.action },
    })),
  });

  logger.info(`Notified ${profiles.length} admins of ${details.action} proposal`, 'Predictions', {
    predictionId: prediction.id,
    proposedBy,
  });
}

/**
 * Notify the proposer that their proposal was rejected.
 */
export async function notifyProposerOfRejection(
  prediction: Prediction,
  rejectedBy: string
): Promise<void> {
  const proposedBy = prediction.proposedBy;
  if (!proposedBy) return;

  const profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { username: proposedBy },
        { hiveUsername: proposedBy },
      ],
    },
    select: { id: true },
  });

  if (!profile) return;

  await prisma.notification.create({
    data: {
      recipientId: profile.id,
      type: 'system',
      title: 'Proposal Rejected',
      message: `@${rejectedBy} rejected your ${prediction.proposedAction} proposal for "${prediction.title}".`,
      sourceUsername: rejectedBy,
      data: { predictionId: prediction.id },
    },
  });
}
