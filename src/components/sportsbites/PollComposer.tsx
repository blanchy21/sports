'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import type { PollDefinition } from '@/lib/hive-workerbee/sportsbites';

interface PollComposerProps {
  poll: PollDefinition;
  onChange: (poll: PollDefinition | null) => void;
  className?: string;
}

const MAX_QUESTION_LENGTH = 100;
const MAX_OPTION_LENGTH = 50;

export function PollComposer({ poll, onChange, className }: PollComposerProps) {
  const handleQuestionChange = (question: string) => {
    if (question.length <= MAX_QUESTION_LENGTH) {
      onChange({ ...poll, question });
    }
  };

  const handleOptionChange = (index: 0 | 1, value: string) => {
    if (value.length <= MAX_OPTION_LENGTH) {
      const newOptions: [string, string] = [...poll.options] as [string, string];
      newOptions[index] = value;
      onChange({ ...poll, options: newOptions });
    }
  };

  return (
    <div className={cn('border-primary/20 bg-primary/5 rounded-lg border p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-primary text-sm font-medium">Quick Poll</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <input
            type="text"
            value={poll.question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            placeholder="Ask a question..."
            className="bg-background focus:ring-primary/40 w-full rounded-md border px-3 py-2 text-sm outline-hidden focus:ring-2"
            maxLength={MAX_QUESTION_LENGTH}
          />
          <p className="text-muted-foreground mt-0.5 text-right text-[10px]">
            {poll.question.length}/{MAX_QUESTION_LENGTH}
          </p>
        </div>

        {poll.options.map((option, index) => (
          <div key={index}>
            <input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index as 0 | 1, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="bg-background focus:ring-primary/40 w-full rounded-md border px-3 py-2 text-sm outline-hidden focus:ring-2"
              maxLength={MAX_OPTION_LENGTH}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
