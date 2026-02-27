'use client';

import React, { useState } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { SPORT_CATEGORIES } from '@/types';
import { Loader2 } from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionEditModalProps {
  prediction: PredictionBite;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: PredictionBite) => void;
}

export function PredictionEditModal({
  prediction,
  isOpen,
  onClose,
  onSaved,
}: PredictionEditModalProps) {
  const [title, setTitle] = useState(prediction.title);
  const [outcomeLabels, setOutcomeLabels] = useState(
    prediction.outcomes.map((o) => ({ id: o.id, label: o.label }))
  );
  const [sportCategory, setSportCategory] = useState(prediction.sportCategory ?? '');
  const [matchReference, setMatchReference] = useState(prediction.matchReference ?? '');
  const [locksAt, setLocksAt] = useState(() => {
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const d = new Date(prediction.locksAt);
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOutcomeChange = (id: string, label: string) => {
    setOutcomeLabels((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/predictions/${prediction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          outcomes: outcomeLabels,
          sportCategory: sportCategory || null,
          matchReference: matchReference || null,
          locksAt: new Date(locksAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to update prediction');
      }

      onSaved(data.data.prediction);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prediction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Prediction" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="pred-title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <textarea
            id="pred-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={PREDICTION_CONFIG.MAX_TITLE_LENGTH}
            rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {title.length}/{PREDICTION_CONFIG.MAX_TITLE_LENGTH}
          </p>
        </div>

        {/* Outcome Labels */}
        <div>
          <label className="mb-1 block text-sm font-medium">Outcomes</label>
          <div className="space-y-2">
            {outcomeLabels.map((outcome, i) => (
              <input
                key={outcome.id}
                type="text"
                value={outcome.label}
                onChange={(e) => handleOutcomeChange(outcome.id, e.target.value)}
                maxLength={PREDICTION_CONFIG.MAX_OUTCOME_LABEL_LENGTH}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
                placeholder={`Outcome ${i + 1}`}
                required
              />
            ))}
          </div>
        </div>

        {/* Sport Category */}
        <div>
          <label htmlFor="pred-sport" className="mb-1 block text-sm font-medium">
            Sport Category
          </label>
          <select
            id="pred-sport"
            value={sportCategory}
            onChange={(e) => setSportCategory(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
          >
            <option value="">None</option>
            {SPORT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Match Reference */}
        <div>
          <label htmlFor="pred-match" className="mb-1 block text-sm font-medium">
            Match Reference
          </label>
          <input
            id="pred-match"
            type="text"
            value={matchReference}
            onChange={(e) => setMatchReference(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
            placeholder="e.g. Lakers vs Celtics"
          />
        </div>

        {/* Lock Time */}
        <div>
          <label htmlFor="pred-lock" className="mb-1 block text-sm font-medium">
            Locks At
          </label>
          <input
            id="pred-lock"
            type="datetime-local"
            value={locksAt}
            onChange={(e) => setLocksAt(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-warning text-white hover:bg-warning/90"
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
