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
}

export const EmailAuthSection: React.FC<EmailAuthSectionProps> = ({
  mode,
  values,
  isConnecting,
  onFieldChange,
  onSubmit,
  onToggleMode,
  onTogglePasswordVisibility,
}) => (
  <div className="space-y-4">
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
