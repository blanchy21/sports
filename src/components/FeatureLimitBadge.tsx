"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, Zap } from "lucide-react";

interface FeatureLimitBadgeProps {
  currentCount: number;
  limit: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  onUpgradeClick?: () => void;
}

export const FeatureLimitBadge: React.FC<FeatureLimitBadgeProps> = ({
  currentCount,
  limit,
  label = "Posts",
  showPercentage = true,
  size = "default",
  className,
  onUpgradeClick,
}) => {
  const percentage = Math.round((currentCount / limit) * 100);
  const remaining = limit - currentCount;
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentCount >= limit;

  const getStatusColor = () => {
    if (isAtLimit) return "text-red-600 dark:text-red-400";
    if (isNearLimit) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-amber-500";
    return "bg-primary";
  };

  const getIcon = () => {
    if (isAtLimit) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isNearLimit) return <Info className="h-4 w-4 text-amber-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-card",
        sizeClasses[size],
        className
      )}
    >
      {getIcon()}

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", getStatusColor())}>
            {currentCount}/{limit} {label}
          </span>
          {showPercentage && (
            <span className="text-muted-foreground text-xs">({percentage}%)</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", getProgressColor())}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {(isNearLimit || isAtLimit) && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </button>
      )}

      {!isAtLimit && !isNearLimit && (
        <span className="text-xs text-muted-foreground">{remaining} left</span>
      )}
    </div>
  );
};

// Compact version for headers/navigation
export const FeatureLimitBadgeCompact: React.FC<
  Pick<FeatureLimitBadgeProps, "currentCount" | "limit" | "className" | "onUpgradeClick">
> = ({ currentCount, limit, className, onUpgradeClick }) => {
  const percentage = Math.round((currentCount / limit) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentCount >= limit;

  const getColor = () => {
    if (isAtLimit) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (isNearLimit)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <button
      onClick={onUpgradeClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
        getColor(),
        onUpgradeClick && "hover:opacity-80 cursor-pointer",
        className
      )}
      disabled={!onUpgradeClick}
    >
      {isAtLimit ? (
        <AlertCircle className="h-3 w-3" />
      ) : isNearLimit ? (
        <Info className="h-3 w-3" />
      ) : null}
      <span>
        {currentCount}/{limit}
      </span>
    </button>
  );
};
