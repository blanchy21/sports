"use client";

import React from "react";
import { X, Calendar, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
  initialDate?: Date;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  initialDate,
}: ScheduleModalProps) {
  // Initialize with date 1 hour from now, rounded to nearest 15 minutes
  const getDefaultDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  const [selectedDate, setSelectedDate] = React.useState<Date>(
    initialDate || getDefaultDate()
  );

  // Get user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Format time for input[type="time"]
  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(selectedDate);
    const [year, month, day] = e.target.value.split("-").map(Number);
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(selectedDate);
    const [hours, minutes] = e.target.value.split(":").map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
  };

  const handleSchedule = () => {
    // Validate that the date is in the future
    if (selectedDate <= new Date()) {
      alert("Please select a future date and time");
      return;
    }
    onSchedule(selectedDate);
    onClose();
  };

  // Quick select options
  const quickOptions = [
    { label: "In 1 hour", hours: 1 },
    { label: "In 3 hours", hours: 3 },
    { label: "Tomorrow 9 AM", hours: null, time: "09:00", addDay: 1 },
    { label: "Tomorrow 6 PM", hours: null, time: "18:00", addDay: 1 },
  ];

  const handleQuickSelect = (option: { hours: number | null; time?: string; addDay?: number }) => {
    const newDate = new Date();
    if (option.hours !== null) {
      newDate.setHours(newDate.getHours() + option.hours);
      newDate.setMinutes(Math.ceil(newDate.getMinutes() / 15) * 15);
    } else if (option.time && option.addDay) {
      newDate.setDate(newDate.getDate() + option.addDay);
      const [hours, minutes] = option.time.split(":").map(Number);
      newDate.setHours(hours, minutes, 0, 0);
    }
    setSelectedDate(newDate);
  };

  if (!isOpen) return null;

  // Get min date (now)
  const minDate = new Date().toISOString().split("T")[0];
  // Get max date (30 days from now)
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Schedule Post</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick select buttons */}
        <div className="mb-6">
          <span className="text-sm font-medium text-foreground mb-2 block">
            Quick select
          </span>
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSelect(option)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm",
                  "bg-muted hover:bg-muted/80 text-foreground",
                  "transition-colors"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date and time inputs */}
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date
            </label>
            <input
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={handleDateChange}
              min={minDate}
              max={maxDate}
              className={cn(
                "w-full px-3 py-2 rounded-lg border bg-background",
                "text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </label>
            <input
              type="time"
              value={formatTimeForInput(selectedDate)}
              onChange={handleTimeChange}
              className={cn(
                "w-full px-3 py-2 rounded-lg border bg-background",
                "text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            />
          </div>
        </div>

        {/* Timezone display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-lg">
          <Globe className="h-4 w-4" />
          <span>Timezone: {timezone}</span>
        </div>

        {/* Preview */}
        <div className="mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm text-muted-foreground">Your post will be published:</span>
          <p className="text-foreground font-medium">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            at{" "}
            {selectedDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSchedule}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
