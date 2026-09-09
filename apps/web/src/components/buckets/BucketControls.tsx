import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const bucketInput =
  'w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400';
export const bucketCard =
  'rounded-2xl border border-slate-200 bg-white/80 p-5 space-y-3 text-slate-800';

export function BucketAction({
  children,
  onClick,
  disabled,
  tone = 'violet',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'violet' | 'lime' | 'neutral';
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 py-2.5 font-bold text-slate-900 transition hover:brightness-95 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${tone === 'lime' ? 'bg-lime-400' : tone === 'violet' ? 'bg-violet-400' : 'bg-slate-200'}`}
    >
      {children}
    </button>
  );
}

export function BucketDialog({
  title,
  onClose,
  children,
  footer,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[90dvh] w-full max-w-xl rounded-t-3xl bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-black/50 sm:bottom-auto sm:top-[5dvh] sm:rounded-3xl"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b p-5">
          <h2 id={id} className="text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
            className="h-11 w-11 rounded-xl bg-slate-200 text-xl"
          >
            ×
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && <div className="shrink-0 border-t p-5">{footer}</div>}
      </div>
    </dialog>,
    document.body
  );
}
