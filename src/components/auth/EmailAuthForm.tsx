import React, { useState } from 'react';
import { Button } from '@/components/core/Button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { EmailAuthFormProps } from './types';
import { useAuthForm } from './hooks/useAuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseAuth } from '@/lib/firebase/auth';
import { FirebaseError } from 'firebase/app';

// Map Firebase error codes to user-friendly messages
const getFirebaseErrorMessage = (error: FirebaseError): string => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Try signing up instead.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
};

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({
  isLoginMode,
  onToggleMode,
  onSuccess,
  onError,
}) => {
  const { formState, updateField, togglePasswordVisibility, validateForm } =
    useAuthForm(isLoginMode);

  const { loginWithFirebase } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      onError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        // Sign in existing user
        const authUser = await FirebaseAuth.signIn(formState.email, formState.password);
        loginWithFirebase(authUser);
      } else {
        // Sign up new user
        const username = formState.username || formState.email.split('@')[0];
        const authUser = await FirebaseAuth.signUp(
          formState.email,
          formState.password,
          username,
          username // displayName same as username initially
        );
        loginWithFirebase(authUser);
      }

      onSuccess();
    } catch (error) {
      if (error instanceof FirebaseError) {
        onError(getFirebaseErrorMessage(error));
      } else if (error instanceof Error) {
        // Handle Firebase not configured error
        if (error.message.includes('Firebase is not configured')) {
          onError('Email authentication is currently unavailable. Please try Hive login.');
        } else {
          onError(error.message);
        }
      } else {
        onError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="mb-2 text-lg font-semibold">
        {isLoginMode ? 'Login with Email' : 'Join Sportsblock'}
      </h3>

      {/* Social Proof - only for signup */}
      {!isLoginMode && (
        <div className="mb-4 rounded-lg border border-accent/20 bg-accent/10 p-2">
          <p className="text-sm font-medium text-accent-foreground">
            🎉 47 new members joined this week
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <input
            type="email"
            value={formState.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full border-0 border-b-2 border-gray-300 bg-transparent px-3 py-2 focus:border-primary focus:outline-none"
            placeholder="Email or username"
          />
        </div>

        <div className="relative">
          <input
            type={formState.showPassword ? 'text' : 'password'}
            value={formState.password}
            onChange={(e) => updateField('password', e.target.value)}
            className="w-full border-0 border-b-2 border-gray-300 bg-transparent px-3 py-2 pr-10 focus:border-primary focus:outline-none"
            placeholder="Password"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
          >
            {formState.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Username field only for signup */}
        {!isLoginMode && (
          <div>
            <input
              type="text"
              value={formState.username}
              onChange={(e) => updateField('username', e.target.value)}
              className="w-full border-0 border-b-2 border-gray-300 bg-transparent px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="Choose a username"
            />
          </div>
        )}

        {/* Terms and newsletter only for signup */}
        {!isLoginMode && (
          <div className="space-y-2">
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={formState.acceptTerms}
                onChange={(e) => updateField('acceptTerms', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-600">
                I have read and accept the{' '}
                <a href="#" className="text-primary hover:underline">
                  terms of service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:underline">
                  privacy policy
                </a>
                .
              </span>
            </label>

            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={formState.subscribeNewsletter}
                onChange={(e) => updateField('subscribeNewsletter', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-600">
                Optional: Subscribe to our newsletter for sports updates and earning tips.
              </span>
            </label>

            {/* reCAPTCHA placeholder */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="h-3 w-3" />
                <span className="text-xs">I&apos;m not a robot</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span>Protected by reCAPTCHA</span>
                <div className="flex space-x-1">
                  <a href="#" className="text-accent hover:underline">
                    Privacy
                  </a>
                  <span>•</span>
                  <a href="#" className="text-accent hover:underline">
                    Terms
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-primary py-3 text-base font-semibold hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isLoginMode ? 'Logging in...' : 'Creating account...'}
            </>
          ) : isLoginMode ? (
            'LOGIN'
          ) : (
            'SIGN UP'
          )}
        </Button>

        <p className="text-center text-sm text-gray-600">
          {isLoginMode ? 'NO ACCOUNT? ' : 'ALREADY HAVE AN ACCOUNT? '}
          <button onClick={onToggleMode} className="font-medium text-primary hover:underline">
            {isLoginMode ? 'Create your free account now' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  );
};
