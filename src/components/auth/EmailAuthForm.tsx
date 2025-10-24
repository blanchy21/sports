import React from 'react';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { EmailAuthFormProps } from './types';
import { useAuthForm } from './hooks/useAuthForm';

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({
  isLoginMode,
  onToggleMode,
  onSuccess,
  onError,
}) => {
  const {
    formState,
    updateField,
    togglePasswordVisibility,
    validateForm,
  } = useAuthForm(isLoginMode);

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      onError(validationError);
      return;
    }

    try {
      // For demo purposes, create a mock user
      // const user = {
      //   id: "email_user_" + Date.now(),
      //   username: formState.username || formState.email.split("@")[0],
      //   displayName: formState.username || formState.email.split("@")[0],
      //   isHiveAuth: false,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // };
      
      // Simulate successful login
      onSuccess();
    } catch {
      onError('Login failed. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-2">
        {isLoginMode ? "Login with Email" : "Join Sportsblock"}
      </h3>
      
      {/* Social Proof - only for signup */}
      {!isLoginMode && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-2 mb-4">
          <p className="text-accent-foreground text-sm font-medium">🎉 47 new members joined this week</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <input
            type="email"
            value={formState.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-3 py-2 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent"
            placeholder="Email or username"
          />
        </div>

        <div className="relative">
          <input
            type={formState.showPassword ? "text" : "password"}
            value={formState.password}
            onChange={(e) => updateField('password', e.target.value)}
            className="w-full px-3 py-2 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent pr-10"
            placeholder="Password"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="w-full px-3 py-2 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent"
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
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-xs text-gray-600">
                I have read and accept the{" "}
                <a href="#" className="text-primary hover:underline">terms of service</a> and{" "}
                <a href="#" className="text-primary hover:underline">privacy policy</a>.
              </span>
            </label>

            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={formState.subscribeNewsletter}
                onChange={(e) => updateField('subscribeNewsletter', e.target.checked)}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-xs text-gray-600">
                Optional: Subscribe to our newsletter for sports updates and earning tips.
              </span>
            </label>

            {/* reCAPTCHA placeholder */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="h-3 w-3" />
                <span className="text-xs">I&apos;m not a robot</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span>Protected by reCAPTCHA</span>
                <div className="flex space-x-1">
                  <a href="#" className="text-accent hover:underline">Privacy</a>
                  <span>•</span>
                  <a href="#" className="text-accent hover:underline">Terms</a>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full py-3 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          {isLoginMode ? "LOGIN" : "SIGN UP"}
        </Button>

        <p className="text-center text-sm text-gray-600">
          {isLoginMode ? "NO ACCOUNT? " : "ALREADY HAVE AN ACCOUNT? "}
          <button 
            onClick={onToggleMode}
            className="text-primary hover:underline font-medium"
          >
            {isLoginMode ? "Create your free account now" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
};
