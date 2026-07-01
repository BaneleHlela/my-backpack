// Sequential read-only slideshow for the 'steps' resource type ("sliding notes") — not a
// quiz, no scoring, just Prev/Next navigation through a series of markdown cards.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { IResourceStep } from '@my-backpack/shared';

interface SteppedNotesViewerProps {
  steps: IResourceStep[];
}

export default function SteppedNotesViewer({ steps }: SteppedNotesViewerProps) {
  const [index, setIndex] = useState(0);

  if (steps.length === 0) return null;
  const step = steps[index];

  return (
    <div className="space-y-4">
      {step.title && <h3 className="font-semibold text-gray-800">{step.title}</h3>}
      <div className="prose prose-sm max-w-none text-gray-700">
        <ReactMarkdown>{step.content}</ReactMarkdown>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-violet-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={index === steps.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50 text-sm font-medium text-gray-700 hover:bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
