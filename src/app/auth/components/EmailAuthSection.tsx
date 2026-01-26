import React from "react";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff } from "lucide-react";
import type { AuthMode, EmailFormState } from "../hooks/useAuthPage";

interface EmailAuthSectionProps {
  mode: AuthMode;
  values: EmailFormState;
  isConnecting: boolean;
  onFieldChange: <K extends keyof EmailFormState>(field: K, value: EmailFormState[K]) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
  onTogglePasswordVisibility: () => void;
  onGoogleSignIn?: () => void;
  onForgotPassword?: () => void;
}

export const EmailAuthSection: React.FC<EmailAuthSectionProps> = ({
  mode,
  values,
  isConnecting,
  onFieldChange,
  onSubmit,
  onToggleMode,
  onTogglePasswordVisibility,
  onGoogleSignIn,
  onForgotPassword,
}) => (
  <div className="space-y-4">
    {/* Google Sign-in Button */}
    {onGoogleSignIn && (
      <>
        <Button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isConnecting}
          variant="outline"
          className="w-full h-12 text-base font-medium border-input hover:bg-accent flex items-center justify-center gap-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>
      </>
    )}

    <div>
      <label htmlFor="email" className="sr-only">Email address</label>
      <input
        id="email"
        type="email"
        value={values.email}
        onChange={(event) => onFieldChange("email", event.target.value)}
        className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
        placeholder="Email address"
        autoComplete="email"
        required
      />
    </div>

    <div className="relative">
      <label htmlFor="password" className="sr-only">Password</label>
      <input
        id="password"
        type={values.showPassword ? "text" : "password"}
        value={values.password}
        onChange={(event) => onFieldChange("password", event.target.value)}
        className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-12 bg-background text-foreground"
        placeholder="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={6}
      />
      <button
        type="button"
        onClick={onTogglePasswordVisibility}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={values.showPassword ? "Hide password" : "Show password"}
      >
        {values.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>

    {mode === "login" && onForgotPassword && (
      <div className="text-right">
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={isConnecting}
          className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
        >
          Forgot password?
        </button>
      </div>
    )}

    {mode === "signup" && (
      <>
        <div>
          <label htmlFor="username" className="sr-only">Username</label>
          <input
            id="username"
            type="text"
            value={values.username}
            onChange={(event) => onFieldChange("username", event.target.value)}
            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
            placeholder="Choose a username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
          />
        </div>

        <div>
          <label htmlFor="displayName" className="sr-only">Display name (optional)</label>
          <input
            id="displayName"
            type="text"
            value={values.displayName}
            onChange={(event) => onFieldChange("displayName", event.target.value)}
            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
            placeholder="Display name (optional)"
            autoComplete="name"
            maxLength={64}
          />
        </div>
      </>
    )}

    {mode === "signup" && (
      <div className="space-y-3">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={values.acceptTerms}
            onChange={(event) => onFieldChange("acceptTerms", event.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            required
          />
          <span className="text-sm text-slate-600">
            I agree to the{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>

        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={values.subscribeNewsletter}
            onChange={(event) => onFieldChange("subscribeNewsletter", event.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <span className="text-sm text-slate-600">
            Subscribe to our newsletter for sports updates and earning tips
          </span>
        </label>
      </div>
    )}

    <Button
      onClick={onSubmit}
      disabled={isConnecting}
      className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
    >
      {isConnecting ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
    </Button>

    <p className="text-center text-sm text-muted-foreground">
      {mode === "login" ? "Don't have an account? " : "Already have an account? "}
      <button onClick={onToggleMode} className="text-primary hover:underline font-medium">
        {mode === "login" ? "Sign up" : "Sign in"}
      </button>
    </p>

    {mode === "signup" && (
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start space-x-2">
          <div className="w-4 h-4 text-muted-foreground mt-0.5 text-sm">ℹ️</div>
          <div>
            <h4 className="font-medium text-sm text-foreground">Email Account Benefits</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Start exploring immediately! You can always upgrade to a Hive account later to unlock earning rewards.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default EmailAuthSection;
