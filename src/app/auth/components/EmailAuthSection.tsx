"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Info } from "lucide-react";
import type { AuthMode, EmailFormState } from "../hooks/useAuthPage";

interface EmailAuthSectionProps {
  mode: AuthMode;
  values: EmailFormState;
  isConnecting: boolean;
  onFieldChange: <K extends keyof EmailFormState>(
    field: K,
    value: EmailFormState[K]
  ) => void;
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
          className="w-full h-12 text-base font-medium border-border hover:bg-muted/50 flex items-center justify-center gap-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">
              Or with email
            </span>
          </div>
        </div>
      </>
    )}

    {/* Email Input */}
    <div className="relative group">
      <label htmlFor="email" className="sr-only">
        Email address
      </label>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Mail className="h-5 w-5" />
      </div>
      <input
        id="email"
        type="email"
        value={values.email}
        onChange={(event) => onFieldChange("email", event.target.value)}
        className="w-full pl-12 pr-4 py-3.5 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground"
        placeholder="Email address"
        autoComplete="email"
        required
      />
    </div>

    {/* Password Input */}
    <div className="relative group">
      <label htmlFor="password" className="sr-only">
        Password
      </label>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Lock className="h-5 w-5" />
      </div>
      <input
        id="password"
        type={values.showPassword ? "text" : "password"}
        value={values.password}
        onChange={(event) => onFieldChange("password", event.target.value)}
        className="w-full pl-12 pr-12 py-3.5 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground"
        placeholder="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={6}
      />
      <button
        type="button"
        onClick={onTogglePasswordVisibility}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={values.showPassword ? "Hide password" : "Show password"}
      >
        {values.showPassword ? (
          <EyeOff className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </button>
    </div>

    {/* Forgot Password Link */}
    {mode === "login" && onForgotPassword && (
      <div className="text-right">
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={isConnecting}
          className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
        >
          Forgot password?
        </button>
      </div>
    )}

    {/* Signup-only fields */}
    {mode === "signup" && (
      <>
        {/* Username Input */}
        <div className="relative group">
          <label htmlFor="username" className="sr-only">
            Username
          </label>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <User className="h-5 w-5" />
          </div>
          <input
            id="username"
            type="text"
            value={values.username}
            onChange={(event) => onFieldChange("username", event.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Choose a username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
          />
        </div>

        {/* Display Name Input */}
        <div className="relative group">
          <label htmlFor="displayName" className="sr-only">
            Display name (optional)
          </label>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <User className="h-5 w-5" />
          </div>
          <input
            id="displayName"
            type="text"
            value={values.displayName}
            onChange={(event) =>
              onFieldChange("displayName", event.target.value)
            }
            className="w-full pl-12 pr-4 py-3.5 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-background text-foreground transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Display name (optional)"
            autoComplete="name"
            maxLength={64}
          />
        </div>

        {/* Terms & Newsletter */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={values.acceptTerms}
              onChange={(event) =>
                onFieldChange("acceptTerms", event.target.checked)
              }
              className="mt-1 h-4 w-4 text-primary focus:ring-primary/20 border-input rounded cursor-pointer"
              required
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              I agree to the{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Privacy Policy
              </a>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={values.subscribeNewsletter}
              onChange={(event) =>
                onFieldChange("subscribeNewsletter", event.target.checked)
              }
              className="mt-1 h-4 w-4 text-primary focus:ring-primary/20 border-input rounded cursor-pointer"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Subscribe to our newsletter for sports updates and earning tips
            </span>
          </label>
        </div>
      </>
    )}

    {/* Submit Button */}
    <Button
      onClick={onSubmit}
      disabled={isConnecting}
      className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90 text-white disabled:opacity-50 rounded-xl shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-300 hover:scale-[1.02] group mt-2"
    >
      {isConnecting ? (
        <span className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          />
          Processing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {mode === "login" ? "Sign In" : "Create Account"}
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </span>
      )}
    </Button>

    {/* Toggle Mode Link */}
    <p className="text-center text-sm text-muted-foreground pt-2">
      {mode === "login" ? "Don't have an account? " : "Already have an account? "}
      <button
        onClick={onToggleMode}
        className="text-primary hover:text-primary/80 font-semibold transition-colors"
      >
        {mode === "login" ? "Sign up" : "Sign in"}
      </button>
    </p>

    {/* Info box for signup */}
    {mode === "signup" && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-6 p-4 bg-muted/30 rounded-xl border border-border"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm text-foreground mb-1">
              Email Account Benefits
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Start exploring immediately! You can upgrade to a Hive account
              later to unlock earning rewards and full blockchain features.
            </p>
          </div>
        </div>
      </motion.div>
    )}
  </div>
);

export default EmailAuthSection;
