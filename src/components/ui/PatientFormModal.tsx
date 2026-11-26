import {useEffect, useMemo, useState, type FormEvent} from 'react';
import type {Patient, PatientStatus, StaffMember} from '../../types/dental';
import {getTodayIso} from '../../utils/dateUtils';
import {Modal} from './Modal';

export const PATIENT_STATUSES: PatientStatus[] = [
  'Active',
  'Needs Follow-Up',
  'Inactive',
];

interface PatientFormModalProps {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  staff: StaffMember[];
  editingPatient?: Patient | null;
  onAddPatient: (patient: Omit<Patient, 'id'>) => Promise<boolean>;
  onUpdatePatient?: (patient: Patient) => Promise<boolean>;
}

export function PatientFormModal({
  open,
  onClose,
  patients,
  staff,
  editingPatient = null,
  onAddPatient,
  onUpdatePatient,
}: PatientFormModalProps) {
  const dentists = useMemo(() => {
    const list = staff.filter((s) => s.role === 'Dentist').map((s) => s.name);
    if (editingPatient?.assignedDentist && !list.includes(editingPatient.assignedDentist)) {
      return [editingPatient.assignedDentist, ...list];
    }
    return list.length > 0 ? list : ['Dr. Eleanor Shaw'];
  }, [staff, editingPatient]);

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedDentist, setAssignedDentist] = useState('');
  const [registrationDate, setRegistrationDate] = useState(getTodayIso());
  const [status, setStatus] = useState<PatientStatus>('Active');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setSubmitting(false);

    if (editingPatient) {
      setName(editingPatient.name);
      setReference(editingPatient.reference);
      setPhone(editingPatient.phone);
      setEmail(editingPatient.email);
      setAssignedDentist(editingPatient.assignedDentist);
      setRegistrationDate(editingPatient.registrationDate);
      setStatus(editingPatient.status);
      setNotes(editingPatient.notes ?? '');
      return;
    }

    const maxRefNum = patients.reduce((max, p) => {
      const match = /^DL-(\d+)$/i.exec(p.reference.trim());
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1040);

    setName('');
    setReference(`DL-${maxRefNum + 1}`);
    setPhone('');
    setEmail('');
    setAssignedDentist(dentists[0] ?? 'Dr. Eleanor Shaw');
    setRegistrationDate(getTodayIso());
    setStatus('Active');
    setNotes('');
  }, [open, editingPatient, patients, dentists]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (name.trim().length < 2) {
      setFormError('Please enter the patient’s full name.');
      return;
    }
    if (!reference.trim()) {
      setFormError('Please provide a patient reference code.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 6) {
      setFormError('Please enter a valid telephone number (at least 6 digits).');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!assignedDentist) {
      setFormError('Please select an assigned dentist.');
      return;
    }
    if (!registrationDate) {
      setFormError('Please enter a registration date.');
      return;
    }

    const duplicateRef = patients.some(
      (p) =>
        p.reference.toLowerCase() === reference.trim().toLowerCase() &&
        p.id !== editingPatient?.id,
    );
    if (duplicateRef) {
      setFormError('Another patient record already uses this reference code.');
      return;
    }

    setSubmitting(true);
    try {
      const saved =
        editingPatient && onUpdatePatient
          ? await onUpdatePatient({
              ...editingPatient,
              name: name.trim(),
              reference: reference.trim().toUpperCase(),
              phone: phone.trim(),
              email: email.trim(),
              assignedDentist,
              registrationDate,
              status,
              notes: notes.trim(),
            })
          : await onAddPatient({
              name: name.trim(),
              reference: reference.trim().toUpperCase(),
              phone: phone.trim(),
              email: email.trim(),
              assignedDentist,
              registrationDate,
              status,
              notes: notes.trim(),
            });

      if (saved) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingPatient ? 'Edit Fictional Patient Record' : 'Add Fictional Patient'}
      subtitle="Demonstration records only — do not enter real patient information."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patient-name" className="block text-sm font-medium text-[#203344]">
              Patient Name
            </label>
            <input
              id="patient-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emily Thornton"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div>
            <label htmlFor="patient-ref" className="block text-sm font-medium text-[#203344]">
              Patient Reference
            </label>
            <input
              id="patient-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. DL-1049"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 font-mono text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patient-phone" className="block text-sm font-medium text-[#203344]">
              Telephone Number
            </label>
            <input
              id="patient-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01632 960910"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>

          <div>
            <label htmlFor="patient-email" className="block text-sm font-medium text-[#203344]">
              Email Address
            </label>
            <input
              id="patient-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@demo-patient.example"
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="patient-dentist" className="block text-sm font-medium text-[#203344]">
              Assigned Dentist
            </label>
            <select
              id="patient-dentist"
              value={assignedDentist}
              onChange={(e) => setAssignedDentist(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            >
              {dentists.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="patient-reg-date" className="block text-sm font-medium text-[#203344]">
              Registration Date
            </label>
            <input
              id="patient-reg-date"
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="patient-status" className="block text-sm font-medium text-[#203344]">
              Status
            </label>
            <select
              id="patient-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PatientStatus)}
              className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
            >
              {PATIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="patient-notes" className="block text-sm font-medium text-[#203344]">
            Administrative Notes (optional)
          </label>
          <textarea
            id="patient-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Communication preferences or scheduling notes..."
            className="mt-1.5 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
          />
        </div>

        {formError && (
          <div role="alert" className="rounded-lg border border-[#C75C5C]/30 bg-[#C75C5C]/10 px-3.5 py-2 text-sm text-[#A64444]">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-[#E6EAE7] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E6EAE7] bg-white px-4 py-2 text-sm font-medium text-[#203344] hover:bg-[#F8F7F2]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#174C4F] px-4 py-2 text-sm font-medium text-white hover:bg-[#123D40] disabled:opacity-60"
          >
            {editingPatient ? 'Save Changes' : 'Add Patient'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
