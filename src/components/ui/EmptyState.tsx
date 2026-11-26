import type {LucideIcon} from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D3DBD6] bg-[#F8F7F2]/80 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E6EAE7] bg-[#DCE9E2]/60 text-[#174C4F]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#203344]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#7B8588]">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174C4F]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
