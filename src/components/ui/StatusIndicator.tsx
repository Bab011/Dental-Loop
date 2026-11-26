import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  MinusCircle,
  PauseCircle,
} from 'lucide-react';
import type {
  FollowUpStatus,
  PatientStatus,
  Priority,
  RecallStatus,
  TreatmentStatus,
} from '../../types/dental';

type StatusTone = 'green' | 'amber' | 'red' | 'teal' | 'muted';

const TONE_CLASSES: Record<StatusTone, string> = {
  green: 'text-[#2D6E57] bg-[#39856A]/10 border-[#39856A]/25',
  amber: 'text-[#9F6D1D] bg-[#D99A38]/12 border-[#D99A38]/30',
  red: 'text-[#A64444] bg-[#C75C5C]/10 border-[#C75C5C]/25',
  teal: 'text-[#174C4F] bg-[#DCE9E2]/70 border-[#174C4F]/20',
  muted: 'text-[#5C6568] bg-[#F8F7F2] border-[#E6EAE7]',
};

export function FollowUpStatusLabel({
  status,
  overdue,
}: {
  status: FollowUpStatus;
  overdue?: boolean;
}) {
  if (overdue && status !== 'Completed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.red}`}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#C75C5C]" />
        Overdue
      </span>
    );
  }

  switch (status) {
    case 'Completed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.green}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#39856A]" />
          Completed
        </span>
      );
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.teal}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#174C4F]" />
          In Progress
        </span>
      );
    case 'Rescheduled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.muted}`}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#7B8588]" />
          Rescheduled
        </span>
      );
    case 'Pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.amber}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#D99A38]" />
          Pending
        </span>
      );
  }
}

export function PriorityText({priority}: {priority: Priority}) {
  const colorMap: Record<Priority, string> = {
    Urgent: 'text-[#A64444] font-semibold',
    High: 'text-[#9F6D1D] font-semibold',
    Medium: 'text-[#203344] font-medium',
    Low: 'text-[#7B8588] font-normal',
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs whitespace-nowrap ${colorMap[priority]}`}>
      {priority === 'Urgent' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#C75C5C]" />}
      {priority} Priority
    </span>
  );
}

export function PatientStatusLabel({status}: {status: PatientStatus}) {
  switch (status) {
    case 'Active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.green}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#39856A]" />
          Active
        </span>
      );
    case 'Needs Follow-Up':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.amber}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#D99A38]" />
          Needs Follow-Up
        </span>
      );
    case 'Inactive':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.muted}`}
        >
          <MinusCircle className="h-3.5 w-3.5 shrink-0 text-[#7B8588]" />
          Inactive
        </span>
      );
  }
}

export function TreatmentStatusLabel({status}: {status: TreatmentStatus}) {
  switch (status) {
    case 'Booked':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.green}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#39856A]" />
          Booked
        </span>
      );
    case 'Awaiting Contact':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.amber}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#D99A38]" />
          Awaiting Contact
        </span>
      );
    case 'Follow-Up Scheduled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.teal}`}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#174C4F]" />
          Follow-Up Scheduled
        </span>
      );
    case 'Considering':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.amber}`}
        >
          <PauseCircle className="h-3.5 w-3.5 shrink-0 text-[#D99A38]" />
          Considering
        </span>
      );
    case 'Declined':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.muted}`}
        >
          <MinusCircle className="h-3.5 w-3.5 shrink-0 text-[#7B8588]" />
          Declined
        </span>
      );
  }
}

export function RecallStatusLabel({status}: {status: RecallStatus}) {
  switch (status) {
    case 'Booked':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.green}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#39856A]" />
          Booked
        </span>
      );
    case 'Overdue for Contact':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.red}`}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#C75C5C]" />
          Overdue for Contact
        </span>
      );
    case 'Due Soon':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.amber}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#D99A38]" />
          Due Soon
        </span>
      );
    case 'Contacted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.teal}`}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#174C4F]" />
          Contacted
        </span>
      );
    case 'Deferred':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES.muted}`}
        >
          <PauseCircle className="h-3.5 w-3.5 shrink-0 text-[#7B8588]" />
          Deferred
        </span>
      );
  }
}
