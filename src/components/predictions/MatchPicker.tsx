'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Calendar, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { SportsEvent } from '@/types/sports';

/**
 * Maps prediction sport category IDs to ESPN sport display names
 * used by the /api/sports/events endpoint.
 */
const SPORT_TO_ESPN_NAME: Record<string, string> = {
  football: 'Football',
  'american-football': 'American Football',
  tennis: 'Tennis',
  golf: 'Golf',
};

/** Sport categories that have ESPN event coverage */
export const ESPN_COVERED_SPORTS = new Set(Object.keys(SPORT_TO_ESPN_NAME));

interface MatchPickerProps {
  sportCategory: string;
  selectedEventId: string;
  onSelect: (eventId: string, eventDate: string, eventName: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function MatchPicker({
  sportCategory,
  selectedEventId,
  onSelect,
  onClear,
  disabled,
}: MatchPickerProps) {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SportsEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const espnSportName = SPORT_TO_ESPN_NAME[sportCategory];

  // Fetch events when sport category changes
  useEffect(() => {
    if (!espnSportName) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/sports/events?sport=${encodeURIComponent(espnSportName)}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && Array.isArray(data.data)) {
          setEvents(data.data);
          // If we already have a selected event ID, find it in the new data
          if (selectedEventId) {
            const found = data.data.find((e: SportsEvent) => e.id === selectedEventId);
            setSelectedEvent(found ?? null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [espnSportName, selectedEventId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.league?.toLowerCase().includes(q) ||
        e.teams?.home.toLowerCase().includes(q) ||
        e.teams?.away.toLowerCase().includes(q)
    );
  }, [events, search]);

  function handleSelect(event: SportsEvent) {
    setSelectedEvent(event);
    setIsOpen(false);
    setSearch('');
    onSelect(event.id, event.date, event.name);
  }

  function handleClear() {
    setSelectedEvent(null);
    setSearch('');
    onClear();
  }

  function formatEventDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!espnSportName) return null;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        Link to match (optional)
      </label>

      {/* Selected event display */}
      {selectedEvent ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{selectedEvent.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatEventDate(selectedEvent.date)}</span>
              {selectedEvent.league && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEvent.league}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="ml-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove match link"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-sb-turf/30"
        >
          <span className="text-muted-foreground">
            {loading ? 'Loading matches...' : 'Search for a match'}
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-sb-stadium shadow-lg">
          {/* Search input */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search matches..."
                className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
                autoFocus
              />
            </div>
          </div>

          {/* Event list */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                {loading ? 'Loading...' : 'No upcoming matches found'}
              </p>
            ) : (
              filtered.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleSelect(event)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sb-turf',
                    selectedEventId === event.id && 'bg-amber-500/10'
                  )}
                >
                  <span className="font-medium">{event.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatEventDate(event.date)}</span>
                    {event.league && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{event.league}</span>
                      </>
                    )}
                    {event.venue && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.venue}</span>
                      </>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
