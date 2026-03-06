'use client';

import React from 'react';
import { CONTEST_TYPES } from '@/lib/contests/constants';
import { GolfEntryForm } from './GolfEntryForm';
import { WorldCupEntryForm } from './WorldCupEntryForm';
import type { ContestResponse } from '@/lib/contests/types';

export function ContestEntryForm({ contest }: { contest: ContestResponse }) {
  if (contest.contestType === CONTEST_TYPES.GOLF_FANTASY) {
    return <GolfEntryForm contest={contest} />;
  }
  return <WorldCupEntryForm contest={contest} />;
}
