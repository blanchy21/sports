'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { AlertCircle } from 'lucide-react';
import { formatAmount } from '@/lib/utils/format-amount';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  symbol?: string;
  /** Optional icon rendered before the input */
  icon?: React.ReactNode;
  /** CSS class for the focus ring border color (e.g. "focus-within:border-amber-500") */
  focusClass?: string;
  /** CSS class for the MAX button text color */
  maxButtonClass?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  max,
  placeholder = '0.000',
  disabled = false,
  error,
  symbol = 'MEDALS',
  icon,
  focusClass = 'focus-within:border-amber-500',
  maxButtonClass = 'text-warning hover:text-amber-700 dark:hover:text-amber-300',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point with up to 3 decimals
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      onChange(val);
    }
  };

  const handleMaxClick = () => {
    if (max !== undefined) {
      onChange(formatAmount(max));
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-background px-3 py-2',
          error ? 'border-destructive' : cn('border-border', focusClass),
          disabled && 'bg-muted/50 opacity-50'
        )}
      >
        {icon}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <span className="font-medium text-muted-foreground">{symbol}</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            disabled={disabled}
            className={cn('h-7 px-2', maxButtonClass)}
          >
            MAX
          </Button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

export default AmountInput;
