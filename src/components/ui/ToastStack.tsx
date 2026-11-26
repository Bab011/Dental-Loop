import {AlertCircle, CheckCircle2, Info, X} from 'lucide-react';
import type {ToastNotice} from '../../types/dental';

interface ToastStackProps {
  toasts: ToastNotice[];
  onDismiss: (id: string) => void;
}

export function ToastStack({toasts, onDismiss}: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 inset-x-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styleMap = {
          success: 'border-[#39856A]/35 bg-white text-[#203344]',
          error: 'border-[#C75C5C]/35 bg-white text-[#203344]',
          info: 'border-[#174C4F]/25 bg-white text-[#203344]',
        };
        const iconMap = {
          success: <CheckCircle2 className="h-4 w-4 shrink-0 text-[#39856A]" />,
          error: <AlertCircle className="h-4 w-4 shrink-0 text-[#C75C5C]" />,
          info: <Info className="h-4 w-4 shrink-0 text-[#174C4F]" />,
        };

        return (
          <div
            key={toast.id}
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_8px_24px_rgba(32,51,68,0.1)] ${styleMap[toast.type]}`}
          >
            <div className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5">{iconMap[toast.type]}</span>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-[#7B8588] transition-colors hover:bg-[#F8F7F2] hover:text-[#203344]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
