'use client';

import React from 'react';
import { X, Calendar, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { useToast, toast } from '@/components/core/Toast';

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
  initialDate?: Date;
}

export function ScheduleModal({ isOpen, onClose, onSchedule, initialDate }: ScheduleModalProps) {
  const { addToast } = useToast();
  // Initialize with date 1 hour from now, rounded to nearest 15 minutes
  const getDefaultDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  const [selectedDate, setSelectedDate] = React.useState<Date>(initialDate || getDefaultDate());

  // Get user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Format time for input[type="time"]
  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(selectedDate);
    const [year, month, day] = e.target.value.split('-').map(Number);
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(selectedDate);
    const [hours, minutes] = e.target.value.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
  };

  const handleSchedule = () => {
    // Validate that the date is in the future
    if (selectedDate <= new Date()) {
      addToast(toast.error('Error', 'Please select a future date and time'));
      return;
    }
    onSchedule(selectedDate);
    onClose();
  };

  // Quick select options
  const quickOptions = [
    { label: 'In 1 hour', hours: 1 },
    { label: 'In 3 hours', hours: 3 },
    { label: 'Tomorrow 9 AM', hours: null, time: '09:00', addDay: 1 },
    { label: 'Tomorrow 6 PM', hours: null, time: '18:00', addDay: 1 },
  ];

  const handleQuickSelect = (option: { hours: number | null; time?: string; addDay?: number }) => {
    const newDate = new Date();
    if (option.hours !== null) {
      newDate.setHours(newDate.getHours() + option.hours);
      newDate.setMinutes(Math.ceil(newDate.getMinutes() / 15) * 15);
    } else if (option.time && option.addDay) {
      newDate.setDate(newDate.getDate() + option.addDay);
      const [hours, minutes] = option.time.split(':').map(Number);
      newDate.setHours(hours, minutes, 0, 0);
    }
    setSelectedDate(newDate);
  };

  if (!isOpen) return null;

  // Get min date (now)
  const minDate = new Date().toISOString().split('T')[0];
  // Get max date (30 days from now)
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-4 shadow-xl sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Schedule Post</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick select buttons */}
        <div className="mb-4 sm:mb-6">
          <span className="mb-2 block text-sm font-medium text-foreground">Quick select</span>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSelect(option)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs sm:text-sm',
                  'bg-muted text-foreground hover:bg-muted/80',
                  'text-center transition-colors'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date and time inputs */}
        <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
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
                'w-full rounded-lg border bg-background px-3 py-2',
                'text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </label>
            <input
              type="time"
              value={formatTimeForInput(selectedDate)}
              onChange={handleTimeChange}
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2',
                'text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>
        </div>

        {/* Timezone display */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground sm:mb-6 sm:p-3 sm:text-sm">
          <Globe className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Timezone: {timezone}</span>
        </div>

        {/* Preview */}
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:mb-6">
          <span className="text-xs text-muted-foreground sm:text-sm">
            Your post will be published:
          </span>
          <p className="text-sm font-medium text-foreground sm:text-base">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {selectedDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="button" onClick={handleSchedule} className="w-full sm:w-auto">
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
