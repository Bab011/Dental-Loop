import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  MessageSquareText,
  UserX,
} from 'lucide-react';
import type {
  ClinicWorkspaceData,
  FollowUp,
  NavSection,
  TemplateCategory,
} from '../../types/dental';
import {
  formatClinicCurrency,
  formatDisplayDate,
  formatRelativeDueLabel,
  getTodayIso,
  isFollowUpOverdue,
  isFollowUpToday,
} from '../../utils/dateUtils';
import {EmptyState} from '../ui/EmptyState';
import {FollowUpStatusLabel, PriorityText} from '../ui/StatusIndicator';

interface OverviewViewProps {
  data: ClinicWorkspaceData;
  onNavigate: (
    section: NavSection,
    options?: {
      followUpFilter?: 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';
      followUpCategory?: string;
      openCreateModal?: boolean;
      patientId?: string;
      templateTitle?: TemplateCategory;
    },
  ) => void;
  onCompleteFollowUp: (followUp: FollowUp) => void;
}

export function OverviewView({
  data,
  onNavigate,
  onCompleteFollowUp,
}: OverviewViewProps) {
  const today = getTodayIso();
  const patientMap = new Map(data.patients.map((p) => [p.id, p]));

  const overdueFollowUps = data.followUps.filter((f) =>
    isFollowUpOverdue(f.dueDate, f.status),
  );
  const followUpsDueToday = data.followUps.filter((f) =>
    isFollowUpToday(f.dueDate, f.status),
  );
  const unbookedTreatments = data.treatments.filter(
    (t) => t.status !== 'Booked' && t.status !== 'Declined',
  );
  const missedAppointments = data.followUps.filter(
    (f) => f.category === 'Missed Appointment' && f.status !== 'Completed',
  );
  const upcomingRecalls = data.recalls.filter(
    (r) => r.status === 'Due Soon' || r.status === 'Overdue for Contact',
  );

  const openTreatmentValue = unbookedTreatments.reduce(
    (sum, item) => sum + (item.estimatedValue ?? 0),
    0,
  );

  const attentionItems = [...data.followUps]
    .filter((f) => f.status !== 'Completed')
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      const priorityRank = {Urgent: 0, High: 1, Medium: 2, Low: 3};
      return priorityRank[a.priority] - priorityRank[b.priority];
    });

  const kpiCards = [
    {
      label: 'Overdue follow-ups',
      value: overdueFollowUps.length,
      subtext:
        overdueFollowUps.length > 0 ? 'Immediate outreach' : 'All caught up',
      statusText: overdueFollowUps.length > 0 ? 'Alert' : 'Nominal',
      figureColor:
        overdueFollowUps.length > 0 ? 'text-[#F87171]' : 'text-[#34D399]',
      iconBg:
        overdueFollowUps.length > 0
          ? 'bg-[#EF4444]/20 text-[#F87171] ring-1 ring-[#EF4444]/35'
          : 'bg-[#10B981]/20 text-[#34D399] ring-1 ring-[#10B981]/35',
      statusBadgeClass:
        overdueFollowUps.length > 0
          ? 'text-[#FCA5A5] bg-[#EF4444]/18 border-[#EF4444]/35'
          : 'text-[#6EE7B7] bg-[#10B981]/18 border-[#10B981]/35',
      icon: AlertCircle,
      onClick: () => onNavigate('follow-ups', {followUpFilter: 'overdue'}),
    },
    {
      label: 'Follow-ups due today',
      value: followUpsDueToday.length,
      subtext: 'Scheduled for today',
      statusText: 'Due Today',
      figureColor: 'text-[#FBBF24]',
      iconBg: 'bg-[#F59E0B]/20 text-[#FBBF24] ring-1 ring-[#F59E0B]/35',
      statusBadgeClass: 'text-[#FDE68A] bg-[#F59E0B]/18 border-[#F59E0B]/35',
      icon: Clock,
      onClick: () => onNavigate('follow-ups', {followUpFilter: 'today'}),
    },
    {
      label: 'Treatments awaiting booking',
      value: unbookedTreatments.length,
      subtext: `${formatClinicCurrency(openTreatmentValue, data.settings.currency)} open plans`,
      statusText: 'Open Plans',
      figureColor: 'text-white',
      iconBg: 'bg-[#DCE9E2]/15 text-[#DCE9E2] ring-1 ring-[#DCE9E2]/25',
      statusBadgeClass: 'text-[#DCE9E2] bg-white/10 border-white/15',
      icon: FileSpreadsheet,
      onClick: () => onNavigate('treatments'),
    },
    {
      label: 'Missed appointments',
      value: missedAppointments.length,
      subtext: 'Rebooking required',
      statusText: missedAppointments.length > 0 ? 'Action Needed' : 'Clear',
      figureColor:
        missedAppointments.length > 0 ? 'text-[#F87171]' : 'text-[#34D399]',
      iconBg:
        missedAppointments.length > 0
          ? 'bg-[#EF4444]/20 text-[#F87171] ring-1 ring-[#EF4444]/35'
          : 'bg-[#10B981]/20 text-[#34D399] ring-1 ring-[#10B981]/35',
      statusBadgeClass:
        missedAppointments.length > 0
          ? 'text-[#FCA5A5] bg-[#EF4444]/18 border-[#EF4444]/35'
          : 'text-[#6EE7B7] bg-[#10B981]/18 border-[#10B981]/35',
      icon: UserX,
      onClick: () =>
        onNavigate('follow-ups', {
          followUpFilter: 'all',
          followUpCategory: 'Missed Appointment',
        }),
    },
    {
      label: 'Patients due for recall',
      value: upcomingRecalls.length,
      subtext: 'Clinic-set recall dates',
      statusText: 'Recall Queue',
      figureColor: 'text-[#34D399]',
      iconBg: 'bg-[#10B981]/20 text-[#34D399] ring-1 ring-[#10B981]/35',
      statusBadgeClass: 'text-[#6EE7B7] bg-[#10B981]/18 border-[#10B981]/35',
      icon: CalendarCheck2,
      onClick: () => onNavigate('recalls'),
    },
  ];

  const getSuggestedTemplate = (category: FollowUp['category']): TemplateCategory => {
    switch (category) {
      case 'Missed Appointment':
        return 'Missed appointment follow-up';
      case 'Treatment Follow-Up':
        return 'Treatment follow-up';
      case 'Patient Recall':
        return 'Patient recall';
      case 'Post-Treatment Check-In':
        return 'Post-treatment check-in';
      default:
        return 'Appointment confirmation';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards anchored on --color-navy-dark (#203344) with subtle dark-mode overlay */}
      <section aria-label="Daily Follow-Up Summary" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <h2 className="font-display text-sm font-semibold text-[#203344]">
            Daily Follow-Up Summary
          </h2>
          <span className="text-xs font-medium text-[#5E686B] tabular-nums">
            {attentionItems.length} open follow-up items across{' '}
            {data.patients.length} patients
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#2D4458] bg-[var(--color-navy-dark)] p-5 text-left shadow-[0_6px_18px_rgba(32,51,68,0.16)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#DCE9E2]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174C4F]"
              >
                {/* Subtle dark-mode overlay for tonal depth */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-black/15 to-black/30 transition-opacity group-hover:opacity-80"
                />

                <div className="relative z-10 flex items-start justify-between gap-2.5">
                  <span className="text-[13px] font-medium leading-snug text-slate-200">
                    {card.label}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <div className="relative z-10 mt-3.5 flex items-baseline justify-between gap-2">
                  <span
                    className={`font-display text-3xl font-bold tracking-tight tabular-nums ${card.figureColor}`}
                  >
                    {card.value}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${card.statusBadgeClass}`}
                  >
                    {card.statusText}
                  </span>
                </div>

                <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-slate-300">
                  <span className="truncate">{card.subtext}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#DCE9E2] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Prominent Needs Your Attention Panel */}
        <section className="card-surface overflow-hidden rounded-2xl lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B4358] bg-[#203344] px-6 py-4 text-white">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-white">
                  Needs Your Attention
                </h2>
                <span className="rounded-md bg-white/12 px-2 py-0.5 text-xs font-medium text-[#DCE9E2] tabular-nums">
                  {overdueFollowUps.length} overdue · {followUpsDueToday.length} due today
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                Prioritised outstanding follow-ups so nothing slips past reception ({formatDisplayDate(today)}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('follow-ups', {followUpFilter: 'all'})}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#174C4F] hover:border-[#DCE9E2]/30 whitespace-nowrap"
            >
              View All Follow-Ups
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {attentionItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CheckCircle2}
                title="All follow-ups are complete"
                description="There are no outstanding patient follow-ups right now. Create a new follow-up when a patient needs attention."
                actionLabel="Create Follow-Up"
                onAction={() =>
                  onNavigate('follow-ups', {
                    followUpFilter: 'all',
                    openCreateModal: true,
                  })
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-[#DCE1DD]">
              {attentionItems.map((item) => {
                const patient = patientMap.get(item.patientId);
                const overdue = isFollowUpOverdue(item.dueDate, item.status);
                const dueToday = isFollowUpToday(item.dueDate, item.status);
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3.5 px-6 py-4 transition-colors hover:bg-[#F8F7F2] sm:flex-row sm:items-center sm:justify-between ${
                      overdue ? 'bg-[#C75C5C]/[0.04]' : ''
                    }`}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-[#203344]">
                          {patient?.name ?? 'Unknown Patient'}
                        </span>
                        <span className="font-mono text-xs text-[#7B8588] tabular-nums">
                          {patient?.reference ?? '—'}
                        </span>
                        <span aria-hidden="true" className="text-[#C8D0CC]">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-[#174C4F]">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#203344]/85 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7B8588]">
                        <span
                          className={`tabular-nums ${
                            overdue
                              ? 'font-semibold text-[#C75C5C]'
                              : dueToday
                              ? 'font-semibold text-[#B57D22]'
                              : 'text-[#7B8588]'
                          }`}
                        >
                          {formatRelativeDueLabel(item.dueDate, item.status)}
                        </span>
                        <span aria-hidden="true" className="text-[#C8D0CC]">
                          ·
                        </span>
                        <span>Assigned to {item.assignedEmployee}</span>
                        <span aria-hidden="true" className="text-[#C8D0CC]">
                          ·
                        </span>
                        <PriorityText priority={item.priority} />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <FollowUpStatusLabel status={item.status} overdue={overdue} />
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate('messages', {
                            patientId: item.patientId,
                            templateTitle: getSuggestedTemplate(item.category),
                          })
                        }
                        title="Prepare message in Message Centre"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8DED9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#203344] transition-colors hover:border-[#174C4F]/40 hover:bg-[#F8F7F2] whitespace-nowrap"
                      >
                        <MessageSquareText className="h-3.5 w-3.5 text-[#7B8588]" />
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompleteFollowUp(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#174C4F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Rail: Deep Teal Snapshot + Recent Activity */}
        <div className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-[#123B3E] bg-[#174C4F] p-5 text-white shadow-[0_6px_18px_rgba(23,76,79,0.18)]">
            <h3 className="font-display text-sm font-semibold text-white">
              Quick Practice Snapshot
            </h3>
            <p className="mt-0.5 text-xs text-[#DCE9E2]/80">
              Current open workload across clinic modules.
            </p>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                <span className="text-[#DCE9E2]/85">Unbooked treatment plans</span>
                <button
                  type="button"
                  onClick={() => onNavigate('treatments')}
                  className="font-semibold text-white hover:text-[#DCE9E2] hover:underline tabular-nums"
                >
                  {unbookedTreatments.length} ({formatClinicCurrency(openTreatmentValue, data.settings.currency)})
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                <span className="text-[#DCE9E2]/85">Active recall queue</span>
                <button
                  type="button"
                  onClick={() => onNavigate('recalls')}
                  className="font-semibold text-white hover:text-[#DCE9E2] hover:underline tabular-nums"
                >
                  {upcomingRecalls.length} patients
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#DCE9E2]/85">Registered demo patients</span>
                <button
                  type="button"
                  onClick={() => onNavigate('patients')}
                  className="font-semibold text-white hover:text-[#DCE9E2] hover:underline tabular-nums"
                >
                  {data.patients.length} records
                </button>
              </div>
            </div>
          </section>

          <section className="card-surface overflow-hidden rounded-2xl">
            <div className="border-b border-[#DCE1DD] bg-[#F4F2EC] px-6 py-4">
              <h2 className="text-base font-semibold text-[#203344]">
                Recent Activity
              </h2>
              <p className="mt-0.5 text-xs text-[#7B8588]">
                Latest team updates across patients, treatments, and recalls.
              </p>
            </div>
            {data.recentActivity.length === 0 ? (
              <div className="p-6 text-sm text-[#7B8588]">
                No recent clinic activity recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#DCE1DD]/80">
                {data.recentActivity.slice(0, 6).map((entry) => (
                  <li
                    key={entry.id}
                    className="px-6 py-3.5 transition-colors hover:bg-[#F8F7F2]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#203344]">
                        {entry.action}
                      </span>
                      <span className="text-[11px] text-[#7B8588] tabular-nums whitespace-nowrap">
                        {entry.timestamp}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#7B8588]">
                      {entry.detail}
                    </p>
                    <div className="mt-1.5 text-[11px] font-semibold text-[#174C4F]">
                      {entry.actor}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
