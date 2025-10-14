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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // Toggle between login and signup
  
  // Form state for email login/signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  const handleHiveKeychainLogin = async () => {
    setIsConnecting(true);
    try {
      // Check if Hive Keychain is available
      if (typeof window !== "undefined" && (window as unknown as { hive_keychain?: unknown }).hive_keychain) {
        const keychain = (window as unknown as { hive_keychain: { requestSignBuffer: (app: string, message: string, key: string, callback: (response: { success: boolean; data?: { username: string }; error?: string }) => void) => void } }).hive_keychain;
        
        // Request login
        keychain.requestSignBuffer(
          "sportsarena",
          "Login to Sports Arena",
          "Posting",
          (response: { success: boolean; data?: { username: string }; error?: string }) => {
            if (response.success) {
              // Create user object
              const user = {
                id: response.data?.username || "",
                username: response.data?.username || "",
                displayName: response.data?.username || "",
                isHiveAuth: true,
                hiveUsername: response.data?.username || "",
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              login(user, "hive");
              onClose();
            } else {
              console.error("Keychain login failed:", response.error);
            }
            setIsConnecting(false);
          }
        );
      } else {
        // Keychain not available, show download prompt
        alert("Hive Keychain not found. Please install it first.");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting to Hive Keychain:", error);
      setIsConnecting(false);
    }
  };

  const handleHiveSignerLogin = () => {
    // Redirect to Hive Signer OAuth
    const signerUrl = `https://hivesigner.com/oauth2/authorize?client_id=sportsarena&redirect_uri=${encodeURIComponent(window.location.origin + "/auth/callback")}&scope=vote,comment,offline`;
    window.open(signerUrl, "_blank");
  };

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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {isLoginMode ? "Login to Sports Arena" : "Join Sports Arena"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Email Login/Signup */}
          <div className="p-8">
            <h3 className="text-xl font-semibold mb-2">
              {isLoginMode ? "Login with Email" : "Join Sports Arena"}
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

            {/* Alternative Auth Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleHiveKeychainLogin}
                disabled={isConnecting}
                className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
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
                <span className="font-medium">
                  {isLoginMode ? "Login" : "Sign up"} with HiveAuth
                </span>
              </Button>

              <Button
                onClick={handleHiveSignerLogin}
                className="w-full py-3 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image 
                    src="/hivesigner-logo.svg" 
                    alt="Hivesigner" 
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="font-medium">
                  {isLoginMode ? "Login" : "Sign up"} with Hivesigner
                </span>
              </Button>

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
              <h4 className="font-semibold mb-3">Why choose Hive Auth?</h4>
              <div className="space-y-2">
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

            {/* Download Keychain */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Download className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-blue-800">Don&apos;t have Hive Keychain?</h4>
                  <p className="text-xs text-blue-600 mb-2">
                    Install the browser extension to connect your Hive account.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50">
                    Download Keychain
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};