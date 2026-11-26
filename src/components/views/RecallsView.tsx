import {
  CalendarCheck2,
  Edit3,
  Info,
  MessageSquareText,
  Plus,
  Search,
} from 'lucide-react';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import type {
  ClinicWorkspaceData,
  PatientRecall,
  RecallStatus,
  TemplateCategory,
} from '../../types/dental';
import {
  addDaysIso,
  formatDisplayDate,
  getTodayIso,
} from '../../utils/dateUtils';
import {EmptyState} from '../ui/EmptyState';
import {Modal} from '../ui/Modal';
import {RecallStatusLabel} from '../ui/StatusIndicator';

interface RecallsViewProps {
  data: ClinicWorkspaceData;
  onAddRecall: (recall: Omit<PatientRecall, 'id'>) => Promise<boolean>;
  onUpdateRecall: (recall: PatientRecall) => Promise<boolean>;
  onOpenMessage: (patientId: string, templateTitle: TemplateCategory) => void;
}

const RECALL_STATUSES: RecallStatus[] = [
  'Due Soon',
  'Overdue for Contact',
  'Contacted',
  'Booked',
  'Deferred',
];

function RecallDateInput({
  value,
  ariaLabel,
  onCommit,
}: {
  value: string;
  ariaLabel: string;
  onCommit: (nextDate: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => {
        const val = e.target.value;
        setDraft(val);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
        const year = Number(val.slice(0, 4));
        if (year >= 1900 && year <= 2100 && val !== value) {
          onCommit(val);
        }
      }}
      onBlur={() => {
        if (draft !== value) {
          setDraft(value);
        }
      }}
      className="rounded-lg border border-[#E6EAE7] bg-white px-2.5 py-1 text-xs font-medium text-[#203344] tabular-nums focus:border-[#174C4F] focus:outline-none"
    />
  );
}

export function RecallsView({
  data,
  onAddRecall,
  onUpdateRecall,
  onOpenMessage,
}: RecallsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | RecallStatus>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecall, setEditingRecall] = useState<PatientRecall | null>(null);

  const [patientId, setPatientId] = useState(data.patients[0]?.id ?? '');
  const [clinicRecallNote, setClinicRecallNote] = useState('');
  const [lastVisitDate, setLastVisitDate] = useState(addDaysIso(getTodayIso(), -180));
  const [suggestedContactDate, setSuggestedContactDate] = useState(getTodayIso());
  const [assignedEmployee, setAssignedEmployee] = useState(
    data.staff[2]?.name ?? data.staff[0]?.name ?? '',
  );
  const [status, setStatus] = useState<RecallStatus>('Due Soon');
  const [formError, setFormError] = useState<string | null>(null);

  const patientMap = useMemo(
    () => new Map(data.patients.map((p) => [p.id, p])),
    [data.patients],
  );

  const filteredRecalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...data.recalls]
      .filter((item) => {
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (q) {
          const patient = patientMap.get(item.patientId);
          const haystack =
            `${patient?.name ?? ''} ${patient?.reference ?? ''} ${item.clinicRecallNote} ${item.assignedEmployee}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.suggestedContactDate.localeCompare(b.suggestedContactDate));
  }, [data.recalls, statusFilter, searchQuery, patientMap]);

  const openAddModal = () => {
    setEditingRecall(null);
    setPatientId(data.patients[0]?.id ?? '');
    setClinicRecallNote('');
    setLastVisitDate(addDaysIso(getTodayIso(), -150));
    setSuggestedContactDate(getTodayIso());
    setAssignedEmployee(data.staff[2]?.name ?? data.staff[0]?.name ?? '');
    setStatus('Due Soon');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: PatientRecall) => {
    setEditingRecall(item);
    setPatientId(item.patientId);
    setClinicRecallNote(item.clinicRecallNote);
    setLastVisitDate(item.lastVisitDate);
    setSuggestedContactDate(item.suggestedContactDate);
    setAssignedEmployee(item.assignedEmployee);
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
    if (!clinicRecallNote.trim()) {
      setFormError('Please enter your clinic’s recall note or timing basis.');
      return;
    }
    if (!lastVisitDate) {
      setFormError('Please choose the patient’s last visit date.');
      return;
    }
    if (!suggestedContactDate) {
      setFormError('Please choose a suggested contact date.');
      return;
    }
    if (suggestedContactDate < lastVisitDate) {
      setFormError('Suggested contact date cannot be earlier than the last visit date.');
      return;
    }
    if (!assignedEmployee) {
      setFormError('Please assign an employee.');
      return;
    }

    const saved = editingRecall
      ? await onUpdateRecall({
          ...editingRecall,
          patientId,
          clinicRecallNote: clinicRecallNote.trim(),
          lastVisitDate,
          suggestedContactDate,
          assignedEmployee,
          status,
        })
      : await onAddRecall({
          patientId,
          clinicRecallNote: clinicRecallNote.trim(),
          lastVisitDate,
          suggestedContactDate,
          assignedEmployee,
          status,
        });

    if (saved) {
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-[#DCE9E2] bg-[#DCE9E2]/45 px-5 py-3.5 text-sm text-[#203344]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#174C4F]" />
        <p>
          <strong className="font-semibold text-[#174C4F]">Clinic-Determined Recall Schedules:</strong>{' '}
          Recall timings and suggested contact dates are decided individually by your
          dental clinic. Dental Loop does not impose universal clinical recall intervals.
        </p>
      </div>

      <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8588]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, reference, or clinic note..."
              aria-label="Search patient recalls"
              className="w-full rounded-lg border border-[#E6EAE7] bg-[#F8F7F2]/60 py-2 pl-9 pr-3 text-sm text-[#203344] placeholder:text-[#7B8588] focus:border-[#174C4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | RecallStatus)}
            aria-label="Filter recalls by status"
            className="rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
          >
            <option value="All">All Recall Statuses</option>
            {RECALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Schedule Recall
        </button>
      </div>

      {filteredRecalls.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="No patient recalls match this filter"
          description="Record a clinic-determined recall contact date so reception remembers to reach out."
          actionLabel="Schedule Recall"
          onAction={openAddModal}
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
                    Clinic Recall Note
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Last Visit
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Suggested Contact Date
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Assigned To
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Recall Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#DCE9E2]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE7]/75 text-sm">
                {filteredRecalls.map((item) => {
                  const patient = patientMap.get(item.patientId);
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
                      <td className="px-4 py-3.5 align-top text-[#203344]/85 max-w-xs">
                        {item.clinicRecallNote}
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#7B8588] tabular-nums whitespace-nowrap">
                        {formatDisplayDate(item.lastVisitDate)}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <RecallDateInput
                          value={item.suggestedContactDate}
                          ariaLabel={`Suggested contact date for ${patient?.name ?? 'patient'}`}
                          onCommit={(nextDate) =>
                            onUpdateRecall({
                              ...item,
                              suggestedContactDate: nextDate,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#203344] whitespace-nowrap">
                        {item.assignedEmployee}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1.5">
                          <RecallStatusLabel status={item.status} />
                          <div>
                            <select
                              aria-label={`Change recall status for ${patient?.name ?? 'patient'}`}
                              value={item.status}
                              onChange={(e) =>
                                onUpdateRecall({
                                  ...item,
                                  status: e.target.value as RecallStatus,
                                })
                              }
                              className="rounded-md border border-[#E6EAE7] bg-white px-2 py-0.5 text-xs text-[#203344] focus:border-[#174C4F] focus:outline-none"
                            >
                              {RECALL_STATUSES.map((s) => (
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
                          <button
                            type="button"
                            onClick={() =>
                              onOpenMessage(item.patientId, 'Patient recall')
                            }
                            title="Prepare recall message"
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
        title={editingRecall ? 'Edit Patient Recall' : 'Schedule Patient Recall'}
        subtitle="Set the clinic-determined recall contact date and status."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="rec-patient" className="block text-sm font-medium text-[#203344]">
              Patient
            </label>
            <select
              id="rec-patient"
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
            <label htmlFor="rec-note" className="block text-sm font-medium text-[#203344]">
              Clinic Recall Schedule / Note
            </label>
            <input
              id="rec-note"
              type="text"
              value={clinicRecallNote}
              onChange={(e) => setClinicRecallNote(e.target.value)}
              placeholder="e.g. Custom recall date set by Dr. Eleanor Shaw"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rec-last-visit" className="block text-sm font-medium text-[#203344]">
                Last Visit Date
              </label>
              <input
                id="rec-last-visit"
                type="date"
                value={lastVisitDate}
                onChange={(e) => setLastVisitDate(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="rec-contact-date" className="block text-sm font-medium text-[#203344]">
                Suggested Contact Date
              </label>
              <input
                id="rec-contact-date"
                type="date"
                value={suggestedContactDate}
                onChange={(e) => setSuggestedContactDate(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rec-employee" className="block text-sm font-medium text-[#203344]">
                Assigned Employee
              </label>
              <select
                id="rec-employee"
                value={assignedEmployee}
                onChange={(e) => setAssignedEmployee(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {data.staff.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rec-status" className="block text-sm font-medium text-[#203344]">
                Recall Status
              </label>
              <select
                id="rec-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RecallStatus)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {RECALL_STATUSES.map((s) => (
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
              {editingRecall ? 'Save Recall' : 'Schedule Recall'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
