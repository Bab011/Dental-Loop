import {
  Edit3,
  FileSpreadsheet,
  MessageSquareText,
  Plus,
  Search,
} from 'lucide-react';
import {useMemo, useState, type FormEvent} from 'react';
import type {
  ClinicWorkspaceData,
  TemplateCategory,
  TreatmentItem,
  TreatmentStatus,
} from '../../types/dental';
import {
  addDaysIso,
  formatClinicCurrency,
  formatDisplayDate,
  getTodayIso,
} from '../../utils/dateUtils';
import {EmptyState} from '../ui/EmptyState';
import {Modal} from '../ui/Modal';
import {TreatmentStatusLabel} from '../ui/StatusIndicator';

interface TreatmentsViewProps {
  data: ClinicWorkspaceData;
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
  onAddTreatment: (item: Omit<TreatmentItem, 'id'>) => Promise<boolean>;
  onUpdateTreatment: (item: TreatmentItem) => Promise<boolean>;
  onOpenMessage: (
    patientId: string,
    templateTitle: TemplateCategory,
    treatmentRef?: string,
  ) => void;
}

const TREATMENT_STATUSES: TreatmentStatus[] = [
  'Awaiting Contact',
  'Follow-Up Scheduled',
  'Considering',
  'Booked',
  'Declined',
];

export function TreatmentsView({
  data,
  searchQuery: controlledSearchQuery,
  onChangeSearchQuery,
  onAddTreatment,
  onUpdateTreatment,
  onOpenMessage,
}: TreatmentsViewProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onChangeSearchQuery ?? setLocalSearchQuery;
  const [statusFilter, setStatusFilter] = useState<'Unbooked' | 'All' | TreatmentStatus>('Unbooked');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TreatmentItem | null>(null);

  const [patientId, setPatientId] = useState(data.patients[0]?.id ?? '');
  const [treatmentReference, setTreatmentReference] = useState('');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [dateRecommended, setDateRecommended] = useState(getTodayIso());
  const [followUpDate, setFollowUpDate] = useState(addDaysIso(getTodayIso(), 3));
  const [assignedEmployee, setAssignedEmployee] = useState(
    data.staff[3]?.name ?? data.staff[0]?.name ?? '',
  );
  const [estimatedValue, setEstimatedValue] = useState('');
  const [status, setStatus] = useState<TreatmentStatus>('Awaiting Contact');
  const [formError, setFormError] = useState<string | null>(null);

  const patientMap = useMemo(
    () => new Map(data.patients.map((p) => [p.id, p])),
    [data.patients],
  );

  const filteredTreatments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...data.treatments]
      .filter((item) => {
        if (statusFilter === 'Unbooked') {
          if (item.status === 'Booked' || item.status === 'Declined') return false;
        } else if (statusFilter !== 'All' && item.status !== statusFilter) {
          return false;
        }
        if (q) {
          const patient = patientMap.get(item.patientId);
          const haystack =
            `${patient?.name ?? ''} ${patient?.reference ?? ''} ${item.treatmentReference} ${item.treatmentSummary} ${item.assignedEmployee}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  }, [data.treatments, statusFilter, searchQuery, patientMap]);

  const unbookedSummary = useMemo(() => {
    const open = data.treatments.filter(
      (t) => t.status !== 'Booked' && t.status !== 'Declined',
    );
    const totalEstimated = open.reduce(
      (sum, item) => sum + (item.estimatedValue ?? 0),
      0,
    );
    return {count: open.length, totalEstimated};
  }, [data.treatments]);

  const openAddModal = () => {
    const maxCode = data.treatments.reduce((max, item) => {
      const match = /^TR-(\d+)$/i.exec(item.treatmentReference.trim());
      return match ? Math.max(max, Number(match[1])) : max;
    }, 2092);
    setEditingItem(null);
    setPatientId(data.patients[0]?.id ?? '');
    setTreatmentReference(`TR-${maxCode + 1}`);
    setTreatmentSummary('');
    setDateRecommended(getTodayIso());
    setFollowUpDate(addDaysIso(getTodayIso(), 3));
    setAssignedEmployee(data.staff[3]?.name ?? data.staff[0]?.name ?? '');
    setEstimatedValue('');
    setStatus('Awaiting Contact');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: TreatmentItem) => {
    setEditingItem(item);
    setPatientId(item.patientId);
    setTreatmentReference(item.treatmentReference);
    setTreatmentSummary(item.treatmentSummary);
    setDateRecommended(item.dateRecommended);
    setFollowUpDate(item.followUpDate);
    setAssignedEmployee(item.assignedEmployee);
    setEstimatedValue(
      item.estimatedValue !== undefined ? String(item.estimatedValue) : '',
    );
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
    if (!treatmentReference.trim()) {
      setFormError('Please enter a treatment reference.');
      return;
    }
    if (!treatmentSummary.trim()) {
      setFormError('Please enter a brief treatment description.');
      return;
    }
    if (!dateRecommended || !followUpDate) {
      setFormError('Please enter both recommended date and follow-up date.');
      return;
    }
    if (followUpDate < dateRecommended) {
      setFormError('Follow-up date cannot be earlier than the recommended date.');
      return;
    }

    const normalizedRef = treatmentReference.trim().toUpperCase();
    const duplicateRef = data.treatments.some(
      (t) =>
        t.treatmentReference.toLowerCase() === normalizedRef.toLowerCase() &&
        t.id !== editingItem?.id,
    );
    if (duplicateRef) {
      setFormError('Another treatment tracker item already uses this reference code.');
      return;
    }

    let parsedValue: number | undefined = undefined;
    if (estimatedValue.trim() !== '') {
      const numeric = Number(estimatedValue);
      if (!Number.isFinite(numeric) || numeric < 0) {
        setFormError('Estimated value must be a valid non-negative number.');
        return;
      }
      parsedValue = numeric;
    }

    const saved = editingItem
      ? await onUpdateTreatment({
          ...editingItem,
          patientId,
          treatmentReference: normalizedRef,
          treatmentSummary: treatmentSummary.trim(),
          dateRecommended,
          followUpDate,
          assignedEmployee,
          estimatedValue: parsedValue,
          status,
        })
      : await onAddTreatment({
          patientId,
          treatmentReference: normalizedRef,
          treatmentSummary: treatmentSummary.trim(),
          dateRecommended,
          followUpDate,
          assignedEmployee,
          estimatedValue: parsedValue,
          status,
        });

    if (saved) {
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-col gap-4 rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-[#E6EAE7] bg-[#F8F7F2] px-3.5 py-2">
              <span className="text-[#7B8588]">Unbooked treatments: </span>
              <span className="font-semibold text-[#203344] tabular-nums">
                {unbookedSummary.count}
              </span>
            </div>
            <div className="rounded-xl border border-[#E6EAE7] bg-[#DCE9E2]/45 px-3.5 py-2">
              <span className="text-[#174C4F]/80">Estimated open value: </span>
              <span className="font-semibold text-[#174C4F] tabular-nums">
                {formatClinicCurrency(
                  unbookedSummary.totalEstimated,
                  data.settings.currency,
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Treatment Plan
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8588]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, treatment reference, or staff..."
              aria-label="Search treatments"
              className="w-full rounded-lg border border-[#E6EAE7] bg-[#F8F7F2]/60 py-2 pl-9 pr-3 text-sm text-[#203344] placeholder:text-[#7B8588] focus:border-[#174C4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'Unbooked' | 'All' | TreatmentStatus)
              }
              aria-label="Filter treatments by booking status"
              className="rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            >
              <option value="Unbooked">Awaiting Booking (Open)</option>
              <option value="All">All Treatment Plans</option>
              {TREATMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredTreatments.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No treatment items match this filter"
          description="Add a treatment plan recommended by a clinic dentist to keep track of follow-ups until it is booked."
          actionLabel="Add Treatment Plan"
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
                    Treatment Reference
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Recommended
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Follow-Up Date
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Assigned To
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-[#DCE9E2]">
                    Est. Value
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
                {filteredTreatments.map((item) => {
                  const patient = patientMap.get(item.patientId);
                  const isFollowUpPast =
                    item.followUpDate < getTodayIso() &&
                    item.status !== 'Booked' &&
                    item.status !== 'Declined';

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
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono text-xs font-semibold text-[#174C4F]">
                          {item.treatmentReference}
                        </div>
                        <div className="mt-0.5 text-xs text-[#7B8588]">
                          {item.treatmentSummary}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#7B8588] tabular-nums whitespace-nowrap">
                        {formatDisplayDate(item.dateRecommended)}
                      </td>
                      <td
                        className={`px-4 py-3.5 align-top tabular-nums whitespace-nowrap ${
                          isFollowUpPast
                            ? 'font-semibold text-[#C75C5C]'
                            : 'text-[#203344]'
                        }`}
                      >
                        {formatDisplayDate(item.followUpDate)}
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#203344] whitespace-nowrap">
                        {item.assignedEmployee}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right font-semibold text-[#203344] tabular-nums whitespace-nowrap">
                        {formatClinicCurrency(
                          item.estimatedValue,
                          data.settings.currency,
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1.5">
                          <TreatmentStatusLabel status={item.status} />
                          <div>
                            <select
                              aria-label={`Change treatment status for ${item.treatmentReference}`}
                              value={item.status}
                              onChange={(e) =>
                                onUpdateTreatment({
                                  ...item,
                                  status: e.target.value as TreatmentStatus,
                                })
                              }
                              className="rounded-md border border-[#E6EAE7] bg-white px-2 py-0.5 text-xs text-[#203344] focus:border-[#174C4F] focus:outline-none"
                            >
                              {TREATMENT_STATUSES.map((s) => (
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
                              onOpenMessage(
                                item.patientId,
                                'Treatment follow-up',
                                item.treatmentReference,
                              )
                            }
                            title="Prepare treatment follow-up message"
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
        title={editingItem ? 'Edit Treatment Tracker Item' : 'Add Unbooked Treatment'}
        subtitle="Track clinic-recommended treatment plans awaiting patient booking."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tr-patient" className="block text-sm font-medium text-[#203344]">
                Patient
              </label>
              <select
                id="tr-patient"
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
              <label htmlFor="tr-ref" className="block text-sm font-medium text-[#203344]">
                Treatment Reference
              </label>
              <input
                id="tr-ref"
                type="text"
                value={treatmentReference}
                onChange={(e) => setTreatmentReference(e.target.value)}
                placeholder="e.g. TR-2095"
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 font-mono text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tr-summary" className="block text-sm font-medium text-[#203344]">
              Treatment Plan Note (as recorded by dentist)
            </label>
            <input
              id="tr-summary"
              type="text"
              value={treatmentSummary}
              onChange={(e) => setTreatmentSummary(e.target.value)}
              placeholder="e.g. Crown restoration — upper right"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tr-rec-date" className="block text-sm font-medium text-[#203344]">
                Date Recommended
              </label>
              <input
                id="tr-rec-date"
                type="date"
                value={dateRecommended}
                onChange={(e) => setDateRecommended(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tr-fu-date" className="block text-sm font-medium text-[#203344]">
                Follow-Up Date
              </label>
              <input
                id="tr-fu-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="tr-employee" className="block text-sm font-medium text-[#203344]">
                Assigned Employee
              </label>
              <select
                id="tr-employee"
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
              <label htmlFor="tr-value" className="block text-sm font-medium text-[#203344]">
                Est. Value ({data.settings.currency}, optional)
              </label>
              <input
                id="tr-value"
                type="number"
                min="0"
                step="1"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. 450"
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm tabular-nums text-[#203344] focus:border-[#174C4F] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tr-status" className="block text-sm font-medium text-[#203344]">
                Status
              </label>
              <select
                id="tr-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TreatmentStatus)}
                className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
              >
                {TREATMENT_STATUSES.map((s) => (
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
              {editingItem ? 'Save Treatment' : 'Add Treatment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
