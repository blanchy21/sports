"use client";

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { BaseModal, ModalFooter } from "@/components/ui/BaseModal";
import { Button } from "@/components/ui/Button";
import { useMedalsBalance, useTransferMedals } from "@/lib/react-query/queries/useMedals";
import {
  ArrowUpRight,
  User,
  Coins,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface TransferModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Hive account username (sender) */
  account: string;
  /** Pre-fill recipient (optional) */
  initialRecipient?: string;
  /** Pre-fill amount (optional) */
  initialAmount?: string;
  /** Callback after successful transfer */
  onTransferComplete?: (recipient: string, amount: string) => void;
}

type TransferStep = "form" | "confirm" | "success";

/**
 * Format a token amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined): string {
  if (!amount) return "0.000";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.000";
  return num.toFixed(3);
}

/**
 * Custom text input component
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  icon,
  prefix,
}) => (
  <div className="space-y-1">
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-3 py-2",
        error ? "border-red-500" : "border-slate-200 focus-within:border-amber-500",
        disabled && "opacity-50 bg-slate-50"
      )}
    >
      {icon && <span className="text-slate-400">{icon}</span>}
      {prefix && <span className="text-slate-500">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
      />
    </div>
    {error && (
      <p className="text-sm text-red-500 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </div>
);

/**
 * Amount input with MAX button
 */
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  disabled?: boolean;
  error?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  max,
  disabled,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,3}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-white px-3 py-2",
          error ? "border-red-500" : "border-slate-200 focus-within:border-amber-500",
          disabled && "opacity-50 bg-slate-50"
        )}
      >
        <Coins className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0.000"
          disabled={disabled}
          className="flex-1 text-lg font-mono bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
        />
        <span className="text-slate-500 font-medium">MEDALS</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(formatAmount(max))}
            disabled={disabled}
            className="text-amber-600 hover:text-amber-700 h-7 px-2"
          >
            MAX
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * TransferModal component for sending MEDALS to another user
 */
export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  account,
  initialRecipient = "",
  initialAmount = "",
  onTransferComplete,
}) => {
  const [step, setStep] = useState<TransferStep>("form");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [memo, setMemo] = useState("");

  const { data: balance } = useMedalsBalance(account);
  const transferMutation = useTransferMedals();

  const liquidBalance = parseFloat(balance?.liquid || "0");
  const amountNum = parseFloat(amount) || 0;

  // Validation
  const validation = useMemo(() => {
    const errors: { recipient?: string; amount?: string } = {};

    if (!recipient.trim()) {
      errors.recipient = "Recipient is required";
    } else if (recipient.toLowerCase() === account.toLowerCase()) {
      errors.recipient = "Cannot send to yourself";
    } else if (!/^[a-z][a-z0-9.-]{2,15}$/.test(recipient.toLowerCase())) {
      errors.recipient = "Invalid Hive username format";
    }

    if (!amount || amountNum <= 0) {
      errors.amount = "Amount must be greater than 0";
    } else if (amountNum > liquidBalance) {
      errors.amount = "Insufficient balance";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [recipient, amount, amountNum, liquidBalance, account]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setStep("form");
    setRecipient(initialRecipient);
    setAmount(initialAmount);
    setMemo("");
    transferMutation.reset();
    onClose();
  }, [onClose, initialRecipient, initialAmount, transferMutation]);

  // Handle confirm step
  const handleConfirm = async () => {
    if (!validation.valid || transferMutation.isPending) return;

    try {
      await transferMutation.mutateAsync({
        from: account,
        to: recipient.toLowerCase(),
        quantity: formatAmount(amountNum),
        memo: memo.trim() || undefined,
        action: "transfer",
      });

      setStep("success");
      onTransferComplete?.(recipient, formatAmount(amountNum));
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  // Render form step
  const renderFormStep = () => (
    <>
      <div className="space-y-5">
        {/* Balance Display */}
        <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-slate-500">Available Balance</span>
          <span className="font-semibold text-slate-900">
            {formatAmount(liquidBalance)} MEDALS
          </span>
        </div>

        {/* Recipient Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Recipient</label>
          <TextInput
            value={recipient}
            onChange={setRecipient}
            placeholder="username"
            prefix="@"
            icon={<User className="h-4 w-4" />}
            error={step === "form" && recipient ? validation.errors.recipient : undefined}
          />
          <p className="text-xs text-slate-500">
            Enter the Hive username of the recipient
          </p>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Amount</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            max={liquidBalance}
            error={step === "form" && amount ? validation.errors.amount : undefined}
          />
        </div>

        {/* Memo Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Memo <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <TextInput
            value={memo}
            onChange={setMemo}
            placeholder="Add a message..."
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <p className="text-xs text-slate-500">
            The memo will be visible on the blockchain
          </p>
        </div>
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={() => setStep("confirm")}
          disabled={!validation.valid}
        >
          Review Transfer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </ModalFooter>
    </>
  );

  // Render confirm step
  const renderConfirmStep = () => (
    <>
      <div className="space-y-5">
        {/* Transfer Summary */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
          <h4 className="text-sm font-medium text-amber-800 mb-3">Transfer Summary</h4>

          <div className="flex items-center justify-between py-2">
            <div className="text-center">
              <span className="text-xs text-slate-500 block">From</span>
              <span className="font-medium text-slate-900">@{account}</span>
            </div>
            <ArrowUpRight className="h-5 w-5 text-amber-500 mx-3" />
            <div className="text-center">
              <span className="text-xs text-slate-500 block">To</span>
              <span className="font-medium text-slate-900">@{recipient}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-amber-700">Amount</span>
              <span className="font-bold text-amber-900 text-lg">
                {formatAmount(amountNum)} MEDALS
              </span>
            </div>
          </div>

          {memo && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <span className="text-xs text-amber-700 block mb-1">Memo</span>
              <p className="text-sm text-amber-900 bg-amber-100/50 p-2 rounded">
                {memo}
              </p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
          <p>
            This action cannot be undone. Please verify the recipient address
            and amount before confirming.
          </p>
        </div>

        {/* Error Display */}
        {transferMutation.error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Transfer failed</span>
            </div>
            <p className="mt-1">
              {transferMutation.error instanceof Error
                ? transferMutation.error.message
                : "An error occurred"}
            </p>
          </div>
        )}
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button
          variant="outline"
          onClick={() => setStep("form")}
          disabled={transferMutation.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={transferMutation.isPending}
        >
          {transferMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Confirm Transfer
            </>
          )}
        </Button>
      </ModalFooter>
    </>
  );

  // Render success step
  const renderSuccessStep = () => (
    <>
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Transfer Successful!</h3>
          <p className="text-slate-500 mt-1">
            You sent {formatAmount(amountNum)} MEDALS to @{recipient}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Amount</span>
            <span className="font-medium text-slate-900">
              {formatAmount(amountNum)} MEDALS
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600 mt-2">
            <span>Recipient</span>
            <span className="font-medium text-slate-900">@{recipient}</span>
          </div>
          {memo && (
            <div className="flex items-start justify-between text-slate-600 mt-2">
              <span>Memo</span>
              <span className="font-medium text-slate-900 text-right max-w-[200px] truncate">
                {memo}
              </span>
            </div>
          )}
        </div>
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4 justify-center">
        <Button onClick={handleClose}>Close</Button>
      </ModalFooter>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === "success" ? undefined : (
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-amber-500" />
            {step === "form" ? "Send MEDALS" : "Confirm Transfer"}
          </div>
        )
      }
      description={
        step === "form" ? "Transfer MEDALS to another Hive user" : undefined
      }
      size="md"
      showHeader={step !== "success"}
    >
      {step === "form" && renderFormStep()}
      {step === "confirm" && renderConfirmStep()}
      {step === "success" && renderSuccessStep()}
    </BaseModal>
  );
};

export default TransferModal;
