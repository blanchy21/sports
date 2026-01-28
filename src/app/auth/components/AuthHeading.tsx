import React from 'react';
import type { AuthMode } from '../hooks/useAuthPage';

interface AuthHeadingProps {
  mode: AuthMode;
}

export const AuthHeading: React.FC<AuthHeadingProps> = ({ mode }) => (
  <div className="mb-8 text-center">
    <h2 className="mb-2 text-3xl font-bold text-foreground">
      {mode === 'login' ? 'Welcome back' : 'Join Sportsblock'}
    </h2>
    <p className="text-muted-foreground">
      {mode === 'login'
        ? 'Sign in to continue your sports journey'
        : 'Create your account to start earning rewards'}
    </p>
  </div>
);

export default AuthHeading;
