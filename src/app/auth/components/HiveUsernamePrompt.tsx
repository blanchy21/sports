import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

  const providerLabel = selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth';

  return (
    <Card className="mb-6 border-accent/20 bg-accent/10 p-4">
      <h4 className="mb-2 text-sm font-medium text-accent">Enter your Hive username</h4>
      <div className="flex space-x-2">
        <input
          type="text"
          value={hiveUsername}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your Hive username (e.g., blanchy)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
        />
        <Button
          onClick={onSubmit}
          disabled={!hiveUsername.trim() || isConnecting}
          size="sm"
          className="px-3"
        >
          {isConnecting ? 'Connecting...' : 'Continue'}
        </Button>
      </div>
      <p className="mt-1 text-xs text-accent/80">
        This will open {providerLabel} to sign in as @{hiveUsername || 'your-username'}
      </p>
      <button
        onClick={onCancel}
        className="mt-1 text-xs text-accent/80 underline hover:text-accent"
      >
        Cancel
      </button>
    </Card>
  );
};

export default HiveUsernamePrompt;
