"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Download,
  Wallet,
  Shield,
  Zap,
  Users,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Import the AiohaLoginResult type
interface AiohaLoginResult {
  user?: {
    username?: string;
    account?: any;
    session?: string;
  };
  username?: string;
  account?: any;
  session?: string;
  provider?: string;
  aiohaUserId?: string;
  sessionId?: string;
  errorCode?: number;
}

// Type definitions for better type safety
interface AiohaProvider {
  getProviders: () => ProviderValue[];
}

interface ProviderValue {
  toString(): string;
  [key: string]: unknown;
}

interface LoginOptions {
  msg: string;
  keyType: KeyTypes;
}
import { useAioha } from "@/contexts/AiohaProvider";
import { AiohaModal } from "@aioha/react-ui";
import { Providers, KeyTypes } from "@aioha/aioha";
import { FirebaseAuth } from "@/lib/firebase/auth";

export default function AuthPage() {
  const router = useRouter();
  const { loginWithAioha, loginWithFirebase } = useAuth();
  const { aioha, isInitialized } = useAioha();
  
  // UI State
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAiohaModal, setShowAiohaModal] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  // Hive Username State
  const [hiveUsername, setHiveUsername] = useState("");
  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Check available providers when Aioha is initialized
  useEffect(() => {
    if (!aioha || !isInitialized) return;
    
    try {
      const providers = (aioha as AiohaProvider).getProviders();
      const providerStrings = providers.map((provider: ProviderValue) => {
        const providerValue = provider as unknown as Providers;
        switch (providerValue) {
          case Providers.Keychain:
            return 'keychain';
          case Providers.HiveSigner:
            return 'hivesigner';
          case Providers.HiveAuth:
            return 'hiveauth';
          case Providers.Ledger:
            return 'ledger';
        case Providers.PeakVault:
          return 'peakvault';
        case 'metamasksnap':
          return 'metamasksnap';
        default:
          return String(provider);
        }
      });
      
      // Prioritize the top 3 methods: Keychain, HiveSigner, HiveAuth
      const priorityProviders = ['keychain', 'hivesigner', 'hiveauth'];
      const otherProviders = providerStrings.filter(provider => !priorityProviders.includes(provider));
      const orderedProviders = [
        ...priorityProviders.filter(provider => providerStrings.includes(provider)),
        ...otherProviders
      ];
      
      setAvailableProviders(orderedProviders);
    } catch (error) {
      console.error("Error getting available providers:", error);
    }
  }, [aioha, isInitialized]);

  // Listen for Aioha authentication events
  useEffect(() => {
    if (!aioha || !isInitialized) return;

    const handleAuthSuccess = async (event: unknown) => {
      console.log("Aioha authentication successful, processing login...", event);
      setIsConnecting(true);
      setErrorMessage(null);

      try {
        await loginWithAioha(event as AiohaLoginResult);
        console.log("Aioha login successful, redirecting to feed");
        setShowAiohaModal(false);
        router.push('/feed');
      } catch (error) {
        console.error("Aioha login failed:", error);
        setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
      } finally {
        setIsConnecting(false);
      }
    };

    const handleAuthError = (error: unknown) => {
      console.error("Aioha authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage("Authentication failed: " + errorMessage);
      setIsConnecting(false);
    };

    (aioha as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on('connect', handleAuthSuccess);
    (aioha as { on: (event: string, handler: (error: unknown) => void) => void }).on('error', handleAuthError);

    return () => {
      (aioha as { off: (event: string, handler?: (...args: unknown[]) => void) => void }).off('connect', handleAuthSuccess);
      (aioha as { off: (event: string, handler: (error: unknown) => void) => void }).off('error', handleAuthError);
    };
  }, [aioha, isInitialized, loginWithAioha, router]);

  const handleFirebaseLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const authUser = await FirebaseAuth.signIn(email, password);
      loginWithFirebase(authUser);
      router.push('/feed');
    } catch (error) {
      console.error("Firebase login failed:", error);
      setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFirebaseSignup = async () => {
    if (!email || !password || !username) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("Please accept the terms of service");
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const authUser = await FirebaseAuth.signUp(email, password, username, displayName || username);
      loginWithFirebase(authUser);
      router.push('/feed');
    } catch (error) {
      console.error("Firebase signup failed:", error);
      setErrorMessage("Signup failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAiohaLogin = async (provider: string) => {
    console.log(`Starting Aioha login with ${provider}...`);
    
    if (!isInitialized || !aioha) {
      setErrorMessage("Aioha authentication is not available. Please refresh the page and try again.");
      return;
    }
    
    // For providers that need username input, show input first
    if (provider === 'keychain' || provider === 'hiveauth') {
      if (!hiveUsername.trim()) {
        setSelectedProvider(provider);
        setShowHiveUsernameInput(true);
        setErrorMessage(null); // Clear any previous error messages
        return;
      }
    }
    
    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      const availableProviders = (aioha as { getProviders: () => unknown[] }).getProviders();
      
      let providerEnum;
      switch (provider) {
        case 'keychain':
          providerEnum = Providers.Keychain;
          break;
        case 'hivesigner':
          providerEnum = Providers.HiveSigner;
          break;
        case 'hiveauth':
          providerEnum = Providers.HiveAuth;
          break;
        case 'ledger':
          providerEnum = Providers.Ledger;
          break;
        case 'peakvault':
          providerEnum = Providers.PeakVault;
          break;
        case 'metamasksnap':
          providerEnum = Providers.MetaMaskSnap;
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      if (!availableProviders.includes(providerEnum)) {
        throw new Error(`${provider} is not available. Please install the required wallet or try a different provider.`);
      }
      
      let usernameToUse = '';
      if (provider === 'keychain' || provider === 'hiveauth') {
        usernameToUse = hiveUsername.trim();
      }
      
      const result = await (aioha as { login: (provider: Providers, username: string, options: LoginOptions) => Promise<unknown> }).login(providerEnum, usernameToUse, {
        msg: 'Login to Sportsblock',
        keyType: KeyTypes.Posting
      });
      
      console.log("Aioha login result:", JSON.stringify(result, null, 2));
      console.log("Result type:", typeof result);
      console.log("Result keys:", result ? Object.keys(result) : "No result");
      
      if (result && (result as { username?: string }).username && 
          ((result as { success?: boolean }).success !== false)) {
        console.log("Aioha login successful, processing...");
        await loginWithAioha(result);
        setSelectedProvider(null);
        setHiveUsername("");
        router.push('/feed');
      } else if (result && (result as { errorCode?: number }).errorCode === 4901) {
        console.log("User already logged in, processing existing session...");
        try {
          // For already logged in case, try to get user data from Aioha instance directly
          await loginWithAioha(result); // Pass the result even though it has errorCode 4901
          setSelectedProvider(null);
          setHiveUsername("");
          router.push('/feed');
        } catch (sessionError) {
          console.error("Error processing existing session:", sessionError);
          setErrorMessage("Session processing failed: " + (sessionError instanceof Error ? sessionError.message : "Unknown error"));
        }
      } else {
        console.log("Login result validation failed:");
        console.log("- Has username:", !!(result as { username?: string }).username);
        console.log("- Success status:", (result as { success?: boolean }).success);
        console.log("- Error code:", (result as { errorCode?: number }).errorCode);
        throw new Error((result as { error?: string })?.error || "Invalid authentication result");
      }
    } catch (error) {
      console.error("Aioha login failed:", error);
      setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return (
          <Image 
            src="/hive-keychain-logo.svg" 
            alt="Hive Keychain" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        );
      case 'hivesigner':
        return (
          <Image 
            src="/hivesigner-icon.png" 
            alt="HiveSigner" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        );
      case 'hiveauth':
        return (
          <Image 
            src="/hiveauth-logo.png" 
            alt="HiveAuth" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        );
      case 'ledger':
        return (
          <Image 
            src="/ledger-logo.png" 
            alt="Ledger" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        );
      case 'peakvault':
        return <span className="text-2xl">⛰️</span>;
      case 'metamasksnap':
        return (
          <Image 
            src="/metamask-fox.svg" 
            alt="MetaMask" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
        );
      default:
        return <span className="text-2xl">💳</span>;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return 'Hive Keychain';
      case 'hivesigner':
        return 'HiveSigner';
      case 'hiveauth':
        return 'HiveAuth';
      case 'ledger':
        return 'Ledger';
      case 'peakvault':
        return 'Peak Vault';
      case 'metamasksnap':
        return 'MetaMask';
      default:
        return provider;
    }
  };

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return 'Browser Extension';
      case 'hivesigner':
        return 'Web Wallet';
      case 'hiveauth':
        return 'Mobile App';
      case 'ledger':
        return 'Hardware Wallet';
      case 'peakvault':
        return 'Advanced Wallet';
      case 'metamasksnap':
        return 'MetaMask Snap';
      default:
        return 'Wallet';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <div className="flex min-h-screen">
        {/* Left Side - Branding & Benefits */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary text-primary-foreground p-12 flex-col justify-center">
          <div className="max-w-md">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Welcome to Sportsblock</h1>
              <p className="text-xl text-primary-foreground/80">
                Your escape to pure sports content - earn crypto rewards for your insights
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Earn Crypto Rewards</h3>
                  <p className="text-primary-foreground/80">Get paid for quality sports content and engagement</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Decentralized & Secure</h3>
                  <p className="text-primary-foreground/80">Built on Hive blockchain - no middleman, no censorship</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Community Driven</h3>
                  <p className="text-primary-foreground/80">Connect with sports fans and content creators worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {mode === 'login' ? 'Welcome back' : 'Join Sportsblock'}
              </h2>
              <p className="text-muted-foreground">
                {mode === 'login' 
                  ? 'Sign in to continue your sports journey' 
                  : 'Create your account to start earning rewards'
                }
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-destructive/80 hover:text-destructive text-xs mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Hive Username Input */}
            {showHiveUsernameInput && (
              <Card className="mb-6 p-4 border-accent/20 bg-accent/10">
                <h4 className="font-medium text-sm text-accent mb-2">Enter your Hive username</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={hiveUsername}
                    onChange={(e) => setHiveUsername(e.target.value)}
                    placeholder="Enter your Hive username (e.g., blanchy)"
                    className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                    onKeyPress={(e) => e.key === 'Enter' && selectedProvider && handleAiohaLogin(selectedProvider)}
                  />
                  <Button
                    onClick={() => selectedProvider && handleAiohaLogin(selectedProvider)}
                    disabled={!hiveUsername.trim() || isConnecting}
                    size="sm"
                    className="px-3"
                  >
                    {isConnecting ? "Connecting..." : "Continue"}
                  </Button>
                </div>
                <p className="text-xs text-accent/80 mt-1">
                  This will open {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'} to sign in as @{hiveUsername || "your-username"}
                </p>
                <button
                  onClick={() => {
                    setSelectedProvider(null);
                    setHiveUsername("");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-accent/80 hover:text-accent underline mt-1"
                >
                  Cancel
                </button>
              </Card>
            )}

            {/* Hive Blockchain Authentication */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Connect with Hive Blockchain
                </h3>
                <p className="text-sm text-slate-600">
                  Choose your preferred wallet to access the full Hive ecosystem
                </p>
              </div>

              {/* Hive Wallet Buttons */}
              <div className="space-y-3">
                {availableProviders.map((provider, index) => {
                  const isRecommended = index < 3;
                  
                  return (
                    <Button
                      key={provider}
                      onClick={() => handleAiohaLogin(provider)}
                      disabled={isConnecting}
                      className={`w-full h-16 flex items-center justify-start space-x-4 bg-card border-2 ${
                        isRecommended 
                          ? 'border-primary/30 hover:border-primary bg-primary/5' 
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      } text-foreground disabled:opacity-50 transition-all duration-200 relative`}
                    >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                      {getProviderIcon(provider)}
                    </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-semibold text-base">{getProviderName(provider)}</div>
                          {isRecommended && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{getProviderDescription(provider)}</div>
                      </div>
                      <div className="text-muted-foreground">
                        <Wallet className="h-5 w-5" />
                      </div>
                    </Button>
                  );
                })}

                {/* No providers available message */}
                {availableProviders.length === 0 && (
                  <Card className="p-6 text-center border-accent/20 bg-accent/10">
                    <div className="text-accent mb-3">
                      <div className="text-sm font-medium mb-2">No Hive Wallets Detected</div>
                      <div className="text-xs text-accent/80 mb-3">
                        Install a Hive wallet to connect to the blockchain
                      </div>
                      <div className="space-y-1 text-xs text-accent/80">
                        <div>• Install Hive Keychain browser extension</div>
                        <div>• Use HiveSigner web wallet</div>
                        <div>• Download HiveAuth mobile app</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs bg-card border-accent/30 text-accent hover:bg-accent/10"
                      onClick={() => window.open('https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh', '_blank')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Hive Keychain
                    </Button>
                  </Card>
                )}
              </div>

              {/* Benefits for Hive users */}
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start space-x-2">
                  <Star className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm text-foreground">Why choose Hive Blockchain?</h4>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>Earn crypto rewards for quality content</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>Vote and participate in governance</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>Decentralized and censorship-resistant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            {/* Email Authentication Form */}
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
                  placeholder="Email address"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-12 bg-background text-foreground"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Additional fields for signup */}
              {mode === 'signup' && (
                <>
                  <div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
                      placeholder="Choose a username"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background text-foreground"
                      placeholder="Display name (optional)"
                    />
                  </div>
                </>
              )}

              {/* Terms and newsletter for signup */}
              {mode === 'signup' && (
                <div className="space-y-3">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-600">
                      I agree to the{" "}
                      <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{" "}
                      <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </span>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={subscribeNewsletter}
                      onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-600">
                      Subscribe to our newsletter for sports updates and earning tips
                    </span>
                  </label>
                </div>
              )}

              <Button
                onClick={mode === 'login' ? handleFirebaseLogin : handleFirebaseSignup}
                disabled={isConnecting}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
              >
                {isConnecting ? "Processing..." : (mode === 'login' ? "Sign In" : "Create Account")}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === 'login' ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>

            {/* Soft signup benefits */}
            {mode === 'signup' && (
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
        </div>
      </div>

      {/* Aioha Modal */}
      {showAiohaModal && isInitialized && (
        <AiohaModal
          onClose={() => {
            setShowAiohaModal(false);
            setIsConnecting(false);
          }}
          loginOptions={{}}
        />
      )}
    </div>
  );
}
