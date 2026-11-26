import {Edit3, Plus, Search, Users} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {
  ClinicWorkspaceData,
  Patient,
  PatientStatus,
} from '../../types/dental';
import {
  formatDisplayDate,
  isFollowUpOverdue,
} from '../../utils/dateUtils';
import {EmptyState} from '../ui/EmptyState';
import {Modal} from '../ui/Modal';
import {
  PATIENT_STATUSES,
  PatientFormModal,
} from '../ui/PatientFormModal';
import {
  FollowUpStatusLabel,
  PatientStatusLabel,
  RecallStatusLabel,
  TreatmentStatusLabel,
} from '../ui/StatusIndicator';

interface PatientsViewProps {
  data: ClinicWorkspaceData;
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
  onAddPatient: (patient: Omit<Patient, 'id'>) => Promise<boolean>;
  onUpdatePatient: (patient: Patient) => Promise<boolean>;
}

export function PatientsView({
  data,
  searchQuery: controlledSearchQuery,
  onChangeSearchQuery,
  onAddPatient,
  onUpdatePatient,
}: PatientsViewProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onChangeSearchQuery ?? setLocalSearchQuery;
  const [statusFilter, setStatusFilter] = useState<'All' | PatientStatus>('All');
  const [dentistFilter, setDentistFilter] = useState<string>('All');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  const dentists = useMemo(
    () => data.staff.filter((s) => s.role === 'Dentist').map((s) => s.name),
    [data.staff],
  );

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.patients.filter((patient) => {
      const matchesStatus =
        statusFilter === 'All' || patient.status === statusFilter;
      const matchesDentist =
        dentistFilter === 'All' || patient.assignedDentist === dentistFilter;
      const matchesSearch =
        !q ||
        patient.name.toLowerCase().includes(q) ||
        patient.reference.toLowerCase().includes(q) ||
        patient.email.toLowerCase().includes(q) ||
        patient.phone.toLowerCase().includes(q);
      return matchesStatus && matchesDentist && matchesSearch;
    });
  }, [data.patients, searchQuery, statusFilter, dentistFilter]);

  const openAddModal = () => {
    setEditingPatient(null);
    setFormModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setViewingPatient(null);
    setEditingPatient(patient);
    setFormModalOpen(true);
  };

  const linkedFollowUps = viewingPatient
    ? data.followUps.filter((f) => f.patientId === viewingPatient.id)
    : [];
  const linkedTreatments = viewingPatient
    ? data.treatments.filter((t) => t.patientId === viewingPatient.id)
    : [];
  const linkedRecalls = viewingPatient
    ? data.recalls.filter((r) => r.patientId === viewingPatient.id)
    : [];

  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8588]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, reference, email, or phone..."
              aria-label="Search patients"
              className="w-full rounded-lg border border-[#E6EAE7] bg-[#F8F7F2]/60 py-2 pl-9 pr-3 text-sm text-[#203344] placeholder:text-[#7B8588] focus:border-[#174C4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | PatientStatus)}
              aria-label="Filter by patient status"
              className="rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {PATIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={dentistFilter}
              onChange={(e) => setDentistFilter(e.target.value)}
              aria-label="Filter by assigned dentist"
              className="rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            >
              <option value="All">All Dentists</option>
              {dentists.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No matching patient records"
          description="Try clearing your search or filters, or add a new fictional demonstration patient."
          actionLabel="Add Patient"
          onAction={openAddModal}
        />
      ) : (
        <div className="card-surface overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E6EAE7] text-left">
              <thead className="bg-[#203344]">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Patient Name
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Reference
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Telephone
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Email
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Assigned Dentist
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#DCE9E2]">
                    Registered
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
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="transition-colors hover:bg-[#F8F7F2]/70"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#203344]">
                      <button
                        type="button"
                        onClick={() => setViewingPatient(patient)}
                        className="text-left font-semibold hover:text-[#174C4F] hover:underline underline-offset-2"
                      >
                        {patient.name}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#7B8588] tabular-nums whitespace-nowrap">
                      {patient.reference}
                    </td>
                    <td className="px-4 py-3.5 text-[#203344]/85 tabular-nums whitespace-nowrap">
                      {patient.phone}
                    </td>
                    <td className="px-4 py-3.5 text-[#7B8588]">
                      {patient.email}
                    </td>
                    <td className="px-4 py-3.5 text-[#203344] whitespace-nowrap">
                      {patient.assignedDentist}
                    </td>
                    <td className="px-4 py-3.5 text-[#7B8588] tabular-nums whitespace-nowrap">
                      {formatDisplayDate(patient.registrationDate)}
                    </td>
                    <td className="px-4 py-3.5">
                      <PatientStatusLabel status={patient.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingPatient(patient)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#7B8588] hover:bg-[#F8F7F2] hover:text-[#203344]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(patient)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#174C4F] hover:bg-[#DCE9E2]/60"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#E6EAE7] bg-[#F8F7F2]/70 px-5 py-2.5 text-xs text-[#7B8588]">
            Showing{' '}
            <span className="font-semibold tabular-nums text-[#203344]">
              {filteredPatients.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold tabular-nums text-[#203344]">
              {data.patients.length}
            </span>{' '}
            demonstration patient records.
          </div>
        </div>
      )}

      <Modal
        open={Boolean(viewingPatient)}
        onClose={() => setViewingPatient(null)}
        title={viewingPatient?.name ?? 'Patient Details'}
        subtitle={
          viewingPatient
            ? `Reference ${viewingPatient.reference} · Assigned to ${viewingPatient.assignedDentist}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {viewingPatient && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#E6EAE7] bg-[#F8F7F2]/75 p-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-xs text-[#7B8588]">Telephone</div>
                <div className="mt-0.5 font-medium text-[#203344] tabular-nums">
                  {viewingPatient.phone}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#7B8588]">Email</div>
                <div className="mt-0.5 font-medium text-[#203344] break-all">
                  {viewingPatient.email}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#7B8588]">Registration Date</div>
                <div className="mt-0.5 font-medium text-[#203344] tabular-nums">
                  {formatDisplayDate(viewingPatient.registrationDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#7B8588]">Status</div>
                <div className="mt-1">
                  <PatientStatusLabel status={viewingPatient.status} />
                </div>
              </div>
              {viewingPatient.notes && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-[#7B8588]">Administrative Notes</div>
                  <div className="mt-0.5 text-[#203344]">{viewingPatient.notes}</div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#203344]">
                Linked Follow-Ups ({linkedFollowUps.length})
              </h3>
              {linkedFollowUps.length === 0 ? (
                <p className="text-xs text-[#7B8588]">No follow-up activities recorded for this patient.</p>
              ) : (
                <ul className="divide-y divide-[#E6EAE7] rounded-xl border border-[#E6EAE7]">
                  {linkedFollowUps.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium text-[#203344]">{f.category}</div>
                        <div className="truncate text-[#7B8588]">{f.description}</div>
                      </div>
                      <FollowUpStatusLabel
                        status={f.status}
                        overdue={isFollowUpOverdue(f.dueDate, f.status)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#203344]">
                  Treatment Tracker ({linkedTreatments.length})
                </h3>
                {linkedTreatments.length === 0 ? (
                  <p className="text-xs text-[#7B8588]">No treatment items recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {linkedTreatments.map((t) => (
                      <li key={t.id} className="rounded-xl border border-[#E6EAE7] p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-[#203344]">
                            {t.treatmentReference}
                          </span>
                          <TreatmentStatusLabel status={t.status} />
                        </div>
                        <div className="mt-1 text-[#7B8588]">{t.treatmentSummary}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#203344]">
                  Recall Schedule ({linkedRecalls.length})
                </h3>
                {linkedRecalls.length === 0 ? (
                  <p className="text-xs text-[#7B8588]">No recall record set.</p>
                ) : (
                  <ul className="space-y-2">
                    {linkedRecalls.map((r) => (
                      <li key={r.id} className="rounded-xl border border-[#E6EAE7] p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#203344] tabular-nums">
                            Contact: {formatDisplayDate(r.suggestedContactDate)}
                          </span>
                          <RecallStatusLabel status={r.status} />
                        </div>
                        <div className="mt-1 text-[#7B8588]">{r.clinicRecallNote}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#E6EAE7] pt-4">
              <button
                type="button"
                onClick={() => setViewingPatient(null)}
                className="rounded-lg border border-[#E6EAE7] bg-white px-4 py-2 text-sm font-medium text-[#203344] hover:bg-[#F8F7F2]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => openEditModal(viewingPatient)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white hover:bg-[#123D40]"
              >
                <Edit3 className="h-4 w-4" />
                Edit Patient Record
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PatientFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        patients={data.patients}
        staff={data.staff}
        editingPatient={editingPatient}
        onAddPatient={onAddPatient}
        onUpdatePatient={onUpdatePatient}
      />
    </div>
  );
}
