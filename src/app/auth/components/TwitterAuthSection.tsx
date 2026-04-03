'use client';

import React from 'react';
import { Button } from '@/components/core/Button';

interface TwitterAuthSectionProps {
  isConnecting: boolean;
  onTwitterSignIn: () => void;
}

export const TwitterAuthSection: React.FC<TwitterAuthSectionProps> = ({
  isConnecting,
  onTwitterSignIn,
}) => (
  <Button
    type="button"
    onClick={onTwitterSignIn}
    disabled={isConnecting}
    variant="outline"
    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border-sb-border text-base font-medium transition-all duration-200 hover:scale-[1.01] hover:bg-sb-turf/50"
  >
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
    Continue with X
  </Button>
);

export default TwitterAuthSection;
