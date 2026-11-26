import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  MessageSquareText,
  Plus,
  Search,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import type {
  ClinicWorkspaceData,
  FollowUp,
  FollowUpCategory,
  FollowUpStatus,
  Priority,
  TemplateCategory,
} from '../../types/dental';
import {
  formatDisplayDate,
  formatRelativeDueLabel,
  getTodayIso,
  isFollowUpOverdue,
  isFollowUpToday,
  isFollowUpUpcoming,
} from '../../utils/dateUtils';
import {EmptyState} from '../ui/EmptyState';
import {Modal} from '../ui/Modal';
import {FollowUpStatusLabel, PriorityText} from '../ui/StatusIndicator';

export type FollowUpTimeFilter =
  | 'all'
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'completed';

interface FollowUpsViewProps {
  data: ClinicWorkspaceData;
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
  timeFilter: FollowUpTimeFilter;
  onChangeTimeFilter: (filter: FollowUpTimeFilter) => void;
  categoryFilter: string;
  onChangeCategoryFilter: (category: string) => void;
  openCreateTrigger?: number;
  onConsumeCreateTrigger?: () => void;
  onAddFollowUp: (
    followUp: Omit<FollowUp, 'id' | 'createdAt'>,
  ) => Promise<boolean>;
  onUpdateFollowUp: (followUp: FollowUp) => Promise<boolean>;
  onOpenMessage: (patientId: string, templateTitle: TemplateCategory) => void;
}

const CATEGORIES: FollowUpCategory[] = [
  'General Follow-Up',
  'Treatment Follow-Up',
  'Missed Appointment',
  'Post-Treatment Check-In',
  'Patient Recall',
];

const STATUSES: FollowUpStatus[] = [
  'Pending',
  'In Progress',
  'Completed',
  'Rescheduled',
];

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function FollowUpsView({
  data,
  searchQuery: controlledSearchQuery,
  onChangeSearchQuery,
  timeFilter,
  onChangeTimeFilter,
  categoryFilter,
  onChangeCategoryFilter,
  openCreateTrigger = 0,
  onConsumeCreateTrigger,
  onAddFollowUp,
  onUpdateFollowUp,
  onOpenMessage,
}: FollowUpsViewProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onChangeSearchQuery ?? setLocalSearchQuery;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [patientId, setPatientId] = useState(data.patients[0]?.id ?? '');
  const [category, setCategory] = useState<FollowUpCategory>('General Follow-Up');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getTodayIso());
  const [assignedEmployee, setAssignedEmployee] = useState(
    data.staff[2]?.name ?? data.staff[0]?.name ?? '',
  );
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<FollowUpStatus>('Pending');
  const [formError, setFormError] = useState<string | null>(null);

  const patientMap = useMemo(
    () => new Map(data.patients.map((p) => [p.id, p])),
    [data.patients],
  );

  const counts = useMemo(() => {
    return {
      all: data.followUps.length,
      overdue: data.followUps.filter((f) =>
        isFollowUpOverdue(f.dueDate, f.status),
      ).length,
      today: data.followUps.filter((f) => isFollowUpToday(f.dueDate, f.status))
        .length,
      upcoming: data.followUps.filter((f) =>
        isFollowUpUpcoming(f.dueDate, f.status),
      ).length,
      completed: data.followUps.filter((f) => f.status === 'Completed').length,
    };
  }, [data.followUps]);

  const filteredFollowUps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...data.followUps]
      .filter((item) => {
        if (
          timeFilter === 'overdue' &&
          !isFollowUpOverdue(item.dueDate, item.status)
        ) {
          return false;
        }
        if (
          timeFilter === 'today' &&
          !isFollowUpToday(item.dueDate, item.status)
        ) {
          return false;
        }
        if (
          timeFilter === 'upcoming' &&
          !isFollowUpUpcoming(item.dueDate, item.status)
        ) {
          return false;
        }
        if (timeFilter === 'completed' && item.status !== 'Completed') {
          return false;
        }
        if (categoryFilter !== 'All' && item.category !== categoryFilter) {
          return false;
        }
        if (q) {
          const patient = patientMap.get(item.patientId);
          const text =
            `${patient?.name ?? ''} ${patient?.reference ?? ''} ${item.description} ${item.assignedEmployee} ${item.category}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [data.followUps, timeFilter, categoryFilter, searchQuery, patientMap]);

  const openCreateModal = useCallback(() => {
    setEditingFollowUp(null);
    setPatientId(data.patients[0]?.id ?? '');
    setCategory('General Follow-Up');
    setDescription('');
    setDueDate(getTodayIso());
    setAssignedEmployee(data.staff[2]?.name ?? data.staff[0]?.name ?? '');
    setPriority('Medium');
    setStatus('Pending');
    setFormError(null);
    setModalOpen(true);
  }, [data.patients, data.staff]);

  useEffect(() => {
    if (openCreateTrigger > 0) {
      openCreateModal();
      onConsumeCreateTrigger?.();
    }
  }, [openCreateTrigger, openCreateModal, onConsumeCreateTrigger]);

  const openEditModal = (item: FollowUp) => {
    setEditingFollowUp(item);
    setPatientId(item.patientId);
    setCategory(item.category);
    setDescription(item.description);
    setDueDate(item.dueDate);
    setAssignedEmployee(item.assignedEmployee);
    setPriority(item.priority);
    setStatus(item.status);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!patientId) {
      setFormError('Please select a patient.');
      return;
    }
    if (description.trim().length < 4) {
      setFormError('Please enter a short description of the follow-up task.');
      return;
    }
    if (!dueDate) {
      setFormError('Please choose a due date.');
      return;
    }
    if (!assignedEmployee) {
      setFormError('Please assign an employee.');
      return;
    }

    const saved = editingFollowUp
      ? await onUpdateFollowUp({
          ...editingFollowUp,
          patientId,
          category,
          description: description.trim(),
          dueDate,
          assignedEmployee,
          priority,
          status,
        })
      : await onAddFollowUp({
          patientId,
          category,
          description: description.trim(),
          dueDate,
          assignedEmployee,
          priority,
          status,
        });

    if (saved) {
      setModalOpen(false);
    }
  };

  const getTemplateForCategory = (cat: FollowUpCategory): TemplateCategory => {
    switch (cat) {
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

  const filterTabs: Array<{id: FollowUpTimeFilter; label: string; count: number}> = [
    {id: 'all', label: 'All', count: counts.all},
    {id: 'overdue', label: 'Overdue', count: counts.overdue},
    {id: 'today', label: 'Today', count: counts.today},
    {id: 'upcoming', label: 'Upcoming', count: counts.upcoming},
    {id: 'completed', label: 'Completed', count: counts.completed},
  ];

  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-col gap-4 rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#E6EAE7] bg-[#F8F7F2] p-1"
            role="tablist"
            aria-label="Filter follow-ups by schedule"
          >
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={timeFilter === tab.id}
                onClick={() => onChangeTimeFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  timeFilter === tab.id
                    ? 'bg-white text-[#174C4F] font-semibold shadow-xs'
                    : 'text-[#7B8588] hover:text-[#203344]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="tabular-nums text-[11px] opacity-75">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Follow-Up
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8588]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, reference, description, or staff..."
              aria-label="Search follow-ups"
              className="w-full rounded-lg border border-[#E6EAE7] bg-[#F8F7F2]/60 py-2 pl-9 pr-3 text-sm text-[#203344] placeholder:text-[#7B8588] focus:border-[#174C4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => onChangeCategoryFilter(e.target.value)}
            aria-label="Filter by follow-up category"
            className="rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredFollowUps.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No follow-ups in this view"
          description="Try switching schedule filters or create a new patient follow-up activity."
          actionLabel="New Follow-Up"
          onAction={openCreateModal}
        />
      ) : (
        <div className="card-surface overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E6EAE7] text-left">
              <thead className="bg-[#203344]">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Patient
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Category &amp; Description
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Due Date
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Assigned To
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Priority
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#DCE9E2]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE7]/75 text-sm">
                {filteredFollowUps.map((item) => {
                  const patient = patientMap.get(item.patientId);
                  const overdue = isFollowUpOverdue(item.dueDate, item.status);
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-[#F8F7F2]/70"
                    >
                      <td className="px-5 py-3.5 align-top whitespace-nowrap">
                        <div className="font-semibold text-[#203344]">
                          {patient?.name ?? 'Unknown Patient'}
                        </div>
                        <div className="font-mono text-xs text-[#7B8588] tabular-nums">
                          {patient?.reference ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top max-w-md">
                        <div className="text-xs font-semibold text-[#174C4F]">
                          {item.category}
                        </div>
                        <p className="mt-0.5 text-sm text-[#203344]/85">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div
                          className={`text-sm tabular-nums ${
                            overdue
                              ? 'font-semibold text-[#C75C5C]'
                              : 'text-[#203344]'
                          }`}
                        >
                          {formatDisplayDate(item.dueDate)}
                        </div>
                        <div className="text-xs text-[#7B8588]">
                          {formatRelativeDueLabel(item.dueDate, item.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#203344] whitespace-nowrap">
                        {item.assignedEmployee}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <PriorityText priority={item.priority} />
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1.5">
                          <FollowUpStatusLabel
                            status={item.status}
                            overdue={overdue}
                          />
                          <div>
                            <select
                              aria-label={`Change status for ${patient?.name ?? 'follow-up'}`}
                              value={item.status}
                              onChange={(e) =>
                                onUpdateFollowUp({
                                  ...item,
                                  status: e.target.value as FollowUpStatus,
                                })
                              }
                              className="rounded-md border border-[#E6EAE7] bg-white px-2 py-0.5 text-xs text-[#203344] focus:border-[#174C4F] focus:outline-none"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateFollowUp({...item, status: 'Completed'})
                              }
                              title="Mark Completed"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#39856A] hover:bg-[#39856A]/10"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Done
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onOpenMessage(
                                item.patientId,
                                getTemplateForCategory(item.category),
                              )
                            }
                            title="Prepare message"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#7B8588] hover:bg-[#F8F7F2] hover:text-[#203344]"
                          >
                            <MessageSquareText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#174C4F] hover:bg-[#DCE9E2]/60"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFollowUp ? 'Edit Follow-Up Activity' : 'Create Follow-Up Activity'}
        subtitle="Track patient communication and ensure nothing is missed."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fu-patient" className="block text-sm font-medium text-[#203344]">
                Patient
              </label>
              <select
                id="fu-patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {data.patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.reference})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fu-category" className="block text-sm font-medium text-[#203344]">
                Follow-Up Category
              </label>
              <select
                id="fu-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FollowUpCategory)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fu-description" className="block text-sm font-medium text-[#203344]">
              Description
            </label>
            <textarea
              id="fu-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Call patient to offer morning appointment slots..."
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fu-due-date" className="block text-sm font-medium text-[#203344]">
                Due Date
              </label>
              <input
                id="fu-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="fu-employee" className="block text-sm font-medium text-[#203344]">
                Assigned Employee
              </label>
              <select
                id="fu-employee"
                value={assignedEmployee}
                onChange={(e) => setAssignedEmployee(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {data.staff.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fu-priority" className="block text-sm font-medium text-[#203344]">
                Priority
              </label>
              <select
                id="fu-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fu-status" className="block text-sm font-medium text-[#203344]">
                Status
              </label>
              <select
                id="fu-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as FollowUpStatus)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <div role="alert" className="rounded-lg border border-[#C75C5C]/30 bg-[#C75C5C]/10 px-3.5 py-2 text-sm text-[#A64444]">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-[#E6EAE7] pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-[#E6EAE7] bg-white px-4 py-2 text-sm font-medium text-[#203344] hover:bg-[#F8F7F2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white hover:bg-[#123D40]"
            >
              {editingFollowUp ? 'Save Follow-Up' : 'Create Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
