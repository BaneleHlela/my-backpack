// Shared viewport-locked shell for quiz host pages (QuizPage, QuizItemPlayerPage).
// h-[calc(100dvh-60px)] (100dvh, not 100vh, so mobile browser chrome showing/hiding doesn't
// clip content) subtracts AppLayout's sticky TopNav height (h-[60px], see TopNav.tsx) — these
// pages render inside AppLayout's <main>, below TopNav, so locking to the full viewport height
// would push 60px of content below the fold. overflow-hidden on the outer wrapper means the
// page itself never scrolls. The back-button row is flex-shrink-0; the body region is flex-1
// min-h-0 and left un-clipped here — the active-question view (the one with unpredictable
// height, e.g. 5-draggable dnd_single) wraps itself in its own overflow-hidden flex column,
// while start/results/error/loading states are short enough to just render naturally within
// the auto-scrolling body.
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface QuizPageShellProps {
  onBack: () => void;
  backLabel?: string;
  title?: ReactNode;
  children: ReactNode;
}

export default function QuizPageShell({ onBack, backLabel = 'Back to roadmap', title, children }: QuizPageShellProps) {
  return (
    <div className="h-[calc(100dvh-60px)] overflow-hidden flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 min-h-0 flex flex-col">
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>

          {title}
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
