'use client';

import React, { useState } from 'react';
import { QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from './queryClient';

interface QueryClientProviderProps {
  children: React.ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  const [client] = useState(() => makeQueryClient());
  return <TanstackQueryClientProvider client={client}>{children}</TanstackQueryClientProvider>;
}
