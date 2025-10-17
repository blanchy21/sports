"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { 
  X, 
  Eye,
  EyeOff,
  CheckCircle,
  Download
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAioha } from "@/contexts/AiohaProvider";
import { AiohaModal } from "@aioha/react-ui";
import { useRouter } from "next/navigation";
import { Providers, KeyTypes } from "@aioha/aioha";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithHiveUser, loginWithAioha } = useAuth();
  const { aioha, isInitialized } = useAioha();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // Toggle between login and signup
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hiveUsername, setHiveUsername] = useState("");
  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [showAiohaModal, setShowAiohaModal] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<Array<{
    username: string;
    provider: string;
    balance?: string;
  }>>([]);
  const [showAccountDiscovery, setShowAccountDiscovery] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  // Form state for email login/signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  const handleHiveKeychainLogin = async () => {
    // First, ask for the Hive username
    if (!hiveUsername.trim()) {
      setShowHiveUsernameInput(true);
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      // Check if Hive Keychain is available
      if (typeof window !== "undefined" && (window as unknown as { hive_keychain?: unknown }).hive_keychain) {
        const keychain = (window as unknown as { 
          hive_keychain: { 
            requestSignBuffer: (app: string, message: string, key: string, callback: (response: { success: boolean; data?: { username: string; message: string }; error?: string }) => void) => void;
            isLoggedIn: () => boolean;
            getCurrentUser: () => { username: string } | null;
            requestLogin: (callback: (response: { success: boolean; data?: { username: string; message: string }; error?: string }) => void) => void;
          } 
        }).hive_keychain;
        
        // Debug: Log available methods
        console.log("Hive Keychain methods:", Object.keys(keychain));
        console.log("requestLogin available:", typeof keychain.requestLogin);
        console.log("requestSignBuffer available:", typeof keychain.requestSignBuffer);
        
        // Use the provided username in the request
        console.log("Using requestSignBuffer method for username:", hiveUsername);
        
        keychain.requestSignBuffer(
          hiveUsername.trim(), // Use the actual username instead of "sportsblock"
          `Login to Sportsblock as @${hiveUsername.trim()}`,
          "Posting",
          async (response: { success: boolean; data?: { username: string }; error?: string }) => {
            if (response.success && response.data?.username) {
              console.log("Hive Keychain login successful:", response.data);
              
              // Verify the username matches what was requested
              if (response.data.username !== hiveUsername.trim()) {
                setErrorMessage(`Expected username ${hiveUsername.trim()} but got ${response.data.username}. Please try again.`);
                setIsConnecting(false);
                return;
              }
              
              try {
                await loginWithHiveUser(response.data.username);
                onClose();
              } catch (profileError) {
                console.error("Error loading user profile:", profileError);
                setErrorMessage("Login successful but failed to load profile data. Please try again.");
              }
            } else {
              console.error("Keychain login failed:", response.error);
              setErrorMessage("Login failed: " + (response.error || "Unknown error"));
            }
            setIsConnecting(false);
          }
        );
      } else {
        // Keychain not available, show download prompt
        setErrorMessage("Hive Keychain not found. Please install the Hive Keychain browser extension first.");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting to Hive Keychain:", error);
      setErrorMessage("Error connecting to Hive Keychain: " + error);
      setIsConnecting(false);
    }
  };

  const handleAiohaLogin = async (provider: string) => {
    console.log(`Starting Aioha login with ${provider}...`);
    console.log("Aioha available:", !!aioha, "isInitialized:", isInitialized);
    
    if (!isInitialized || !aioha) {
      setErrorMessage("Aioha authentication is not available. Please refresh the page and try again.");
      return;
    }
    
    // For providers that need username input, show input first
    if (provider === 'keychain' || provider === 'hiveauth') {
      if (!hiveUsername.trim()) {
        setSelectedProvider(provider);
        setErrorMessage("Please enter your Hive username first");
        return;
      }
    }
    
    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      // Check available providers first
      const availableProviders = aioha.getProviders();
      console.log("Available providers:", availableProviders);
      
      // Map provider string to Providers enum
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
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      // Check if provider is available
      if (!availableProviders.includes(providerEnum)) {
        throw new Error(`${provider} is not available. Please install the required wallet or try a different provider.`);
      }
      
      // Determine username to use
      let usernameToUse = '';
      if (provider === 'keychain' || provider === 'hiveauth') {
        usernameToUse = hiveUsername.trim();
      } else if (provider === 'hivesigner') {
        // HiveSigner handles username selection internally
        usernameToUse = '';
      } else {
        // For other providers, let them handle username selection
        usernameToUse = '';
      }
      
      // Use Aioha's proper login method according to documentation
      console.log(`Calling aioha.login with ${provider} and username: ${usernameToUse || 'auto-select'}...`);
      const result = await aioha.login(providerEnum, usernameToUse, {
        msg: 'Login to Sportsblock',
        keyType: KeyTypes.Posting
      });
      console.log("Aioha login result:", result);
      
      if (result && result.success && result.username) {
        console.log("Aioha login successful, processing...");
        await loginWithAioha(result);
        setSelectedProvider(null);
        setHiveUsername("");
        onClose();
        router.push('/feed');
      } else if (result && result.errorCode === 4901) {
        // User is already logged in, process existing session
        console.log("User already logged in, processing existing session...");
        try {
          await loginWithAioha();
          setSelectedProvider(null);
          setHiveUsername("");
          onClose();
          router.push('/feed');
        } catch (sessionError) {
          console.error("Error processing existing session:", sessionError);
          setErrorMessage("Session processing failed: " + (sessionError instanceof Error ? sessionError.message : "Unknown error"));
        }
      } else {
        throw new Error(result?.error || "Invalid authentication result");
      }
    } catch (error) {
      console.error("Aioha login failed:", error);
      setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccountDiscovery = async () => {
    console.log("Starting account discovery...");
    
    if (!isInitialized || !aioha) {
      setErrorMessage("Aioha authentication is not available. Please refresh the page and try again.");
      return;
    }
    
    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      // Use Aioha's account discovery feature according to documentation
      console.log("Calling aioha.discoverAccounts...");
      const result = await aioha.discoverAccounts();
      console.log("Account discovery result:", result);
      
      if (result && result.success && result.accounts && result.accounts.length > 0) {
        setDiscoveredAccounts(result.accounts);
        setShowAccountDiscovery(true);
      } else {
        setErrorMessage("No accounts discovered. Please try a different wallet or check your connection.");
      }
    } catch (error) {
      console.error("Account discovery failed:", error);
      setErrorMessage("Account discovery failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccountSelect = async (account: {
    username: string;
    provider: string;
    balance?: string;
  }) => {
    console.log("Selected account:", account);
    
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      
      // Map provider string to Providers enum
      let providerEnum;
      switch (account.provider) {
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
        default:
          throw new Error(`Unknown provider: ${account.provider}`);
      }
      
      // Login with the selected account using Aioha's proper API
      const result = await aioha.login(providerEnum, account.username, {
        msg: 'Login to Sportsblock',
        keyType: KeyTypes.Posting
      });
      console.log("Account login result:", result);
      
          if (result && result.success && result.username) {
            console.log("Account login successful, processing...");
            await loginWithAioha(result);
            setShowAccountDiscovery(false);
            onClose();
            router.push('/feed');
          } else if (result && result.errorCode === 4901) {
            // User is already logged in, process existing session
            console.log("User already logged in, processing existing session...");
            try {
              await loginWithAioha();
              setShowAccountDiscovery(false);
              onClose();
              router.push('/feed');
            } catch (sessionError) {
              console.error("Error processing existing session:", sessionError);
              setErrorMessage("Session processing failed: " + (sessionError instanceof Error ? sessionError.message : "Unknown error"));
            }
          } else {
            throw new Error(result?.error || "Invalid authentication result");
          }
    } catch (error) {
      console.error("Account login failed:", error);
      setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  // Check available providers when Aioha is initialized
  React.useEffect(() => {
    if (!aioha || !isInitialized) return;
    
    try {
      const providers = aioha.getProviders();
      console.log("Available Aioha providers:", providers);
      
      // Map provider enums to strings for easier handling
      const providerStrings = providers.map((provider: unknown) => {
        // Type assertion to handle provider comparison
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const providerValue = provider as any;
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
          default:
            return String(provider);
        }
      });
      
      setAvailableProviders(providerStrings);
    } catch (error) {
      console.error("Error getting available providers:", error);
    }
  }, [aioha, isInitialized]);

  // Listen for Aioha authentication events according to documentation
  React.useEffect(() => {
    if (!aioha || !isInitialized) return;

        const handleAuthSuccess = async (event: unknown) => {
          console.log("Aioha authentication successful, processing login...", event);
          setIsConnecting(true);
          setErrorMessage(null);

          try {
            await loginWithAioha(event);
            console.log("Aioha login successful, redirecting to feed");
            setShowAiohaModal(false);
            onClose();
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

    // Listen for Aioha events according to EIP-1193 style API
    aioha.on('connect', handleAuthSuccess);
    aioha.on('disconnect', () => {
      console.log("Aioha disconnected");
    });
    aioha.on('error', handleAuthError);

    return () => {
      aioha.off('connect', handleAuthSuccess);
      aioha.off('disconnect');
      aioha.off('error', handleAuthError);
    };
  }, [aioha, isInitialized, loginWithAioha, onClose, router]);



  const handleGoogleLogin = () => {
    // For demo purposes, create a mock user
    const user = {
      id: "google_user_" + Date.now(),
      username: "google_user",
      displayName: "Google User",
      isHiveAuth: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    login(user, "soft");
    onClose();
    router.push('/feed');
  };

  const handleEmailLogin = () => {
    // For demo purposes, create a mock user
    const user = {
      id: "email_user_" + Date.now(),
      username: email.split("@")[0],
      displayName: email.split("@")[0],
      isHiveAuth: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    login(user, "soft");
    onClose();
    router.push('/feed');
  };

  const handleEmailSignup = () => {
    if (!acceptTerms) {
      alert("Please accept the terms of service and privacy policy.");
      return;
    }

    // For demo purposes, create a mock user
    const user = {
      id: "email_user_" + Date.now(),
      username: username || email.split("@")[0],
      displayName: username || email.split("@")[0],
      isHiveAuth: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    login(user, "soft");
    onClose();
    router.push('/feed');
  };

  // Clear error message and username input when modal opens/closes or mode changes
  React.useEffect(() => {
    setErrorMessage(null);
    setHiveUsername("");
    setShowHiveUsernameInput(false);
  }, [isOpen, isLoginMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {isLoginMode ? "Login to Sportsblock" : "Join Sportsblock"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Email Login/Signup */}
          <div className="p-8">
            <h3 className="text-xl font-semibold mb-2">
              {isLoginMode ? "Login with Email" : "Join Sportsblock"}
            </h3>
            
            {/* Social Proof - only for signup */}
            {!isLoginMode && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <p className="text-green-800 text-sm font-medium">🎉 47 new members joined this week</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent"
                  placeholder="Email or username"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent pr-12"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Username field only for signup */}
              {!isLoginMode && (
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border-0 border-b-2 border-gray-300 focus:border-primary focus:outline-none bg-transparent"
                    placeholder="Choose a username"
                  />
                </div>
              )}

              {/* Terms and newsletter only for signup */}
              {!isLoginMode && (
                <div className="space-y-3">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      I have read and accept the{" "}
                      <a href="#" className="text-primary hover:underline">terms of service</a> and{" "}
                      <a href="#" className="text-primary hover:underline">privacy policy</a>.
                    </span>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={subscribeNewsletter}
                      onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Optional: Subscribe to our newsletter for sports updates and earning tips.
                    </span>
                  </label>

                  {/* reCAPTCHA placeholder */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="h-4 w-4" />
                      <span className="text-sm">I&apos;m not a robot</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>reCAPTCHA</span>
                        <a href="#" className="text-blue-600 hover:underline">Privacy</a>
                        <span>-</span>
                        <a href="#" className="text-blue-600 hover:underline">Terms</a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={isLoginMode ? handleEmailLogin : handleEmailSignup}
                className="w-full py-4 text-lg font-semibold bg-primary hover:bg-primary/90"
              >
                {isLoginMode ? "LOGIN" : "SIGN UP"}
              </Button>

              <p className="text-center text-sm text-gray-600">
                {isLoginMode ? "NO ACCOUNT? " : "ALREADY HAVE AN ACCOUNT? "}
                <button 
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-primary hover:underline font-medium"
                >
                  {isLoginMode ? "Create your free account now" : "Sign in instead"}
                </button>
              </p>
            </div>
          </div>

          {/* Right Column - Alternative Login/Signup Methods */}
          <div className="p-8 bg-gray-50/50">
            <h3 className="text-xl font-semibold mb-6">
              Or {isLoginMode ? "login" : "sign up"} with
            </h3>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-600 hover:text-red-800 text-xs mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Hive Username Input */}
            {showHiveUsernameInput && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-sm text-blue-800 mb-2">Enter your Hive username</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={hiveUsername}
                    onChange={(e) => setHiveUsername(e.target.value)}
                    placeholder="Enter your Hive username (e.g., blanchy)"
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleHiveKeychainLogin()}
                  />
                  <Button
                    onClick={handleHiveKeychainLogin}
                    disabled={!hiveUsername.trim()}
                    size="sm"
                    className="px-4"
                  >
                    Continue
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This will open Hive Keychain to sign in as @{hiveUsername || "your-username"}
                </p>
              </div>
            )}

            {/* Aioha Authentication Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Connect with Hive Blockchain
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Choose your preferred wallet to access the Hive ecosystem
                </p>
              </div>

              {/* Username Input for Keychain/HiveAuth */}
              {selectedProvider && (selectedProvider === 'keychain' || selectedProvider === 'hiveauth') && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">
                    Enter your Hive username for {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'}
                  </h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={hiveUsername}
                      onChange={(e) => setHiveUsername(e.target.value)}
                      placeholder="Enter your Hive username (e.g., blanchy)"
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAiohaLogin(selectedProvider)}
                    />
                    <Button
                      onClick={() => handleAiohaLogin(selectedProvider)}
                      disabled={!hiveUsername.trim() || isConnecting}
                      size="sm"
                      className="px-4"
                    >
                      {isConnecting ? "Connecting..." : "Continue"}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    This will open {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'} to sign in as @{hiveUsername || "your-username"}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProvider(null);
                      setHiveUsername("");
                      setErrorMessage(null);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 underline mt-1"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Wallet Provider Buttons */}
              <div className="grid grid-cols-1 gap-3">
                {/* Hive Keychain */}
                {availableProviders.includes('keychain') && (
              <Button
                    onClick={() => handleAiohaLogin('keychain')}
                disabled={isConnecting}
                className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image 
                    src="/hive-keychain-logo.svg" 
                    alt="Hive Keychain" 
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                    <div className="text-left">
                      <div className="font-medium">Hive Keychain</div>
                      <div className="text-xs text-gray-500">Browser Extension</div>
                    </div>
              </Button>
                )}

                {/* HiveSigner */}
                {availableProviders.includes('hivesigner') && (
              <Button
                    onClick={() => handleAiohaLogin('hivesigner')}
                    disabled={isConnecting}
                    className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image 
                    src="/hivesigner-logo.svg" 
                        alt="HiveSigner" 
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">HiveSigner</div>
                      <div className="text-xs text-gray-500">Web Wallet</div>
                    </div>
                  </Button>
                )}

                {/* HiveAuth */}
                {availableProviders.includes('hiveauth') && (
                  <Button
                    onClick={() => handleAiohaLogin('hiveauth')}
                    disabled={isConnecting}
                    className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Image 
                        src="/hiveauth-logo.svg" 
                        alt="HiveAuth" 
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                    <div className="text-left">
                      <div className="font-medium">HiveAuth</div>
                      <div className="text-xs text-gray-500">Mobile App</div>
                    </div>
                  </Button>
                )}

                {/* Ledger */}
                {availableProviders.includes('ledger') && (
                  <Button
                    onClick={() => handleAiohaLogin('ledger')}
                    disabled={isConnecting}
                    className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">L</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Ledger</div>
                      <div className="text-xs text-gray-500">Hardware Wallet</div>
                    </div>
                  </Button>
                )}

                {/* Peak Vault */}
                {availableProviders.includes('peakvault') && (
                  <Button
                    onClick={() => handleAiohaLogin('peakvault')}
                    disabled={isConnecting}
                    className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Peak Vault</div>
                      <div className="text-xs text-gray-500">Advanced Wallet</div>
                    </div>
                  </Button>
                )}

                {/* No providers available message */}
                {availableProviders.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium text-yellow-800 mb-2">
                        No Hive Wallets Detected
                      </div>
                      <div className="text-xs text-yellow-600 mb-3">
                        Install a Hive wallet to connect to the blockchain
                      </div>
                      <div className="space-y-1 text-xs text-yellow-600">
                        <div>• Install Hive Keychain browser extension</div>
                        <div>• Use HiveSigner web wallet</div>
                        <div>• Download HiveAuth mobile app</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Discovery Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Multi-Account Discovery
                  </h5>
                  <p className="text-xs text-gray-500 mb-3">
                    Discover and connect multiple Hive accounts from your wallets
                  </p>
                  <Button
                    onClick={handleAccountDiscovery}
                    disabled={isConnecting}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {isConnecting ? "Discovering..." : "Discover Accounts"}
                  </Button>
                </div>

                {/* Discovered Accounts List */}
                {showAccountDiscovery && discoveredAccounts.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <h6 className="text-xs font-medium text-gray-600 mb-2">
                      Found {discoveredAccounts.length} account(s):
                    </h6>
                    {discoveredAccounts.map((account, index) => (
                      <div
                        key={index}
                        onClick={() => handleAccountSelect(account)}
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {account.username?.charAt(0).toUpperCase() || '?'}
                </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium">@{account.username}</div>
                              <div className="text-xs text-gray-500 capitalize">{account.provider}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {account.balance ? `${account.balance} HIVE` : 'Connect'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleGoogleLogin}
                className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image 
                    src="/google-logo.svg" 
                    alt="Google" 
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="font-medium">
                  {isLoginMode ? "Login" : "Sign up"} with Google
                </span>
              </Button>
            </div>

            {/* Benefits */}
            <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-3">Why choose Hive Blockchain?</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Multi-wallet support (Keychain, HiveSigner, HiveAuth, Ledger, Peak Vault)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Account discovery and multi-user authentication</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Earn crypto rewards for quality content</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Vote and participate in governance</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Decentralized and censorship-resistant</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No middleman fees</span>
                </div>
              </div>
            </div>

            {/* Account Selection Instructions */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-green-600 mt-0.5">✓</div>
                <div>
                  <h4 className="font-medium text-sm text-green-800">How it works</h4>
                  <p className="text-xs text-green-700 mb-2">
                    Enter your Hive username first, then Hive Keychain will open to sign in with that specific account. No more confusion about which account to select!
                  </p>
                </div>
              </div>
            </div>

            {/* Download Keychain */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Download className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-blue-800">Don&apos;t have Hive Keychain?</h4>
                  <p className="text-xs text-blue-600 mb-2">
                    Install the browser extension to connect your Hive account. You&apos;ll be able to choose which account to sign in with.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => window.open('https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh', '_blank')}
                  >
                    Download Hive Keychain
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aioha Authentication Modal - Shows all wallet options */}
      {showAiohaModal && isInitialized && aioha && (
        <AiohaModal
          onClose={() => {
            console.log("Aioha modal closed");
            setShowAiohaModal(false);
            setIsConnecting(false);
          }}
          loginOptions={{}}
        />
      )}
    </div>
  );
};