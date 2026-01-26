import React from 'react';

// Mock AiohaProvider that just renders children
export const AiohaProvider: React.FC<{ children: React.ReactNode; aioha?: unknown }> = ({ children }) => {
  return <>{children}</>;
};

// Mock any other exports from @aioha/react-ui as needed
export const useAiohaModal = () => ({
  show: jest.fn(),
  hide: jest.fn(),
});
