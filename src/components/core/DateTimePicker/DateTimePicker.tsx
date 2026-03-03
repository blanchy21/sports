'use client';

import { DesktopDateTimePicker } from './DesktopDateTimePicker';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Responsive date-time picker.
 * - Mobile (< md): native datetime-local input
 * - Desktop (md+): custom calendar popover with time picker
 *
 * Same value/onChange API as <input type="datetime-local">.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  id,
  className,
  placeholder,
  required,
}: DateTimePickerProps) {
  return (
    <>
      {/* Mobile: native datetime-local */}
      <input
        id={id}
        type="datetime-local"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning md:hidden',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />

      {/* Desktop: custom picker */}
      <div className="hidden md:block">
        <DesktopDateTimePicker
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
    </>
  );
}
