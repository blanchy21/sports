import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface HiveUsernamePromptProps {
  visible: boolean;
  hiveUsername: string;
  selectedProvider: string | null;
  isConnecting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const HiveUsernamePrompt: React.FC<HiveUsernamePromptProps> = ({
  visible,
  hiveUsername,
  selectedProvider,
  isConnecting,
  onChange,
  onSubmit,
  onCancel,
}) => {
  if (!visible) {
    return null;
  }

  const providerLabel = selectedProvider === "keychain" ? "Hive Keychain" : "HiveAuth";

  return (
    <Card className="mb-6 p-4 border-accent/20 bg-accent/10">
      <h4 className="font-medium text-sm text-accent mb-2">Enter your Hive username</h4>
      <div className="flex space-x-2">
        <input
          type="text"
          value={hiveUsername}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your Hive username (e.g., blanchy)"
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          onKeyDown={(event) => event.key === "Enter" && onSubmit()}
        />
        <Button onClick={onSubmit} disabled={!hiveUsername.trim() || isConnecting} size="sm" className="px-3">
          {isConnecting ? "Connecting..." : "Continue"}
        </Button>
      </div>
      <p className="text-xs text-accent/80 mt-1">
        This will open {providerLabel} to sign in as @{hiveUsername || "your-username"}
      </p>
      <button onClick={onCancel} className="text-xs text-accent/80 hover:text-accent underline mt-1">
        Cancel
      </button>
    </Card>
  );
};

export default HiveUsernamePrompt;

