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
    <div className={cn('rounded-lg border border-primary/20 bg-primary/5 p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Quick Poll</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            maxLength={MAX_QUESTION_LENGTH}
          />
          <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              maxLength={MAX_OPTION_LENGTH}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
