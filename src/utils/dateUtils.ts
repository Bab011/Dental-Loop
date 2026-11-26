import type {ClinicSettings, FollowUpStatus} from '../types/dental';

export function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(baseIso: string, deltaDays: number): string {
  const [year, month, day] = baseIso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDueLabel(isoDate: string, status?: FollowUpStatus): string {
  if (status === 'Completed') return formatDisplayDate(isoDate);
  const today = getTodayIso();
  if (isoDate === today) return 'Due today';
  const yesterday = addDaysIso(today, -1);
  if (isoDate === yesterday) return '1 day overdue';
  const tomorrow = addDaysIso(today, 1);
  if (isoDate === tomorrow) return 'Tomorrow';

  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = isoDate.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const dueMs = new Date(dy, dm - 1, dd).getTime();
  const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  }
  return formatDisplayDate(isoDate);
}

export function isFollowUpOverdue(dueDate: string, status: FollowUpStatus): boolean {
  if (status === 'Completed') return false;
  return dueDate < getTodayIso();
}

export function isFollowUpToday(dueDate: string, status: FollowUpStatus): boolean {
  if (status === 'Completed') return false;
  return dueDate === getTodayIso();
}

export function isFollowUpUpcoming(dueDate: string, status: FollowUpStatus): boolean {
  if (status === 'Completed') return false;
  return dueDate > getTodayIso();
}

const CURRENCY_LOCALES: Record<ClinicSettings['currency'], {locale: string; symbol: string}> = {
  GBP: {locale: 'en-GB', symbol: '£'},
  USD: {locale: 'en-US', symbol: '$'},
  EUR: {locale: 'en-IE', symbol: '€'},
  CAD: {locale: 'en-CA', symbol: 'CA$'},
  AUD: {locale: 'en-AU', symbol: 'A$'},
  NZD: {locale: 'en-NZ', symbol: 'NZ$'},
};

export function formatClinicCurrency(
  amount: number | undefined,
  currency: ClinicSettings['currency'],
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '—';
  }
  const config = CURRENCY_LOCALES[currency] ?? CURRENCY_LOCALES.GBP;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
