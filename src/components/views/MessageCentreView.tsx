import {Check, Copy, Info, RotateCcw} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {ClinicWorkspaceData, TemplateCategory} from '../../types/dental';
import {formatDisplayDate, getTodayIso} from '../../utils/dateUtils';

interface MessageCentreViewProps {
  data: ClinicWorkspaceData;
  initialPatientId?: string;
  initialTemplateTitle?: TemplateCategory;
  initialTreatmentRef?: string;
  onNotifyCopy: (templateTitle: string) => void;
  onNotifyCopyError?: (message: string) => void;
}

export function MessageCentreView({
  data,
  initialPatientId,
  initialTemplateTitle,
  initialTreatmentRef,
  onNotifyCopy,
  onNotifyCopyError,
}: MessageCentreViewProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (initialTemplateTitle) {
      const match = data.templates.find((t) => t.title === initialTemplateTitle);
      if (match) return match.id;
    }
    return data.templates[0]?.id ?? '';
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatientId || data.patients[0]?.id || '',
  );

  const selectedTemplate = useMemo(
    () =>
      data.templates.find((t) => t.id === selectedTemplateId) ??
      data.templates[0],
    [data.templates, selectedTemplateId],
  );

  const selectedPatient = useMemo(
    () => data.patients.find((p) => p.id === selectedPatientId),
    [data.patients, selectedPatientId],
  );

  const [patientName, setPatientName] = useState(selectedPatient?.name ?? '');
  const [patientRef, setPatientRef] = useState(selectedPatient?.reference ?? '');
  const [dentistName, setDentistName] = useState(
    selectedPatient?.assignedDentist ?? 'Dr. Eleanor Shaw',
  );
  const [appointmentDate, setAppointmentDate] = useState(
    formatDisplayDate(getTodayIso()),
  );
  const initialPatId = initialPatientId || data.patients[0]?.id || '';
  const [treatmentRef, setTreatmentRef] = useState(() => {
    if (initialTreatmentRef) return initialTreatmentRef;
    const linked = data.treatments.find((t) => t.patientId === initialPatId);
    return linked?.treatmentReference ?? '';
  });
  const [staffName, setStaffName] = useState(
    data.staff[2]?.name ?? data.staff[0]?.name ?? 'Rachel Bennett',
  );
  const [customDraft, setCustomDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialTemplateTitle) {
      const match = data.templates.find((t) => t.title === initialTemplateTitle);
      if (match) setSelectedTemplateId(match.id);
    }
  }, [initialTemplateTitle, data.templates]);

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
      const pat = data.patients.find((p) => p.id === initialPatientId);
      if (pat) {
        setPatientName(pat.name);
        setPatientRef(pat.reference);
        setDentistName(pat.assignedDentist);
        if (!initialTreatmentRef) {
          const linkedTreatment = data.treatments.find(
            (t) => t.patientId === pat.id,
          );
          setTreatmentRef(linkedTreatment?.treatmentReference ?? '');
        }
      }
    }
  }, [initialPatientId, initialTreatmentRef, data.patients, data.treatments]);

  useEffect(() => {
    if (initialTreatmentRef) {
      setTreatmentRef(initialTreatmentRef);
    }
  }, [initialTreatmentRef]);

  useEffect(() => {
    if (
      data.patients.length > 0 &&
      !data.patients.some((p) => p.id === selectedPatientId)
    ) {
      const fallback = data.patients[0];
      setSelectedPatientId(fallback.id);
      setPatientName(fallback.name);
      setPatientRef(fallback.reference);
      setDentistName(fallback.assignedDentist);
      const linked = data.treatments.find((t) => t.patientId === fallback.id);
      setTreatmentRef(linked?.treatmentReference ?? '');
    }
  }, [data.patients, data.treatments, selectedPatientId]);

  const applyPatientPreset = (id: string) => {
    setSelectedPatientId(id);
    const pat = data.patients.find((p) => p.id === id);
    if (pat) {
      setPatientName(pat.name);
      setPatientRef(pat.reference);
      setDentistName(pat.assignedDentist);

      const linkedTreatment = data.treatments.find((t) => t.patientId === pat.id);
      setTreatmentRef(linkedTreatment?.treatmentReference ?? '');
    }
  };

  const renderedTemplate = useMemo(() => {
    if (!selectedTemplate) return '';
    return selectedTemplate.body
      .replaceAll('{{patient_name}}', patientName || '[Patient Name]')
      .replaceAll('{{patient_reference}}', patientRef || '[Reference]')
      .replaceAll('{{clinic_name}}', data.settings.clinicName || '[Clinic Name]')
      .replaceAll('{{dentist_name}}', dentistName || '[Dentist]')
      .replaceAll('{{appointment_date}}', appointmentDate || '[Date]')
      .replaceAll('{{treatment_reference}}', treatmentRef || '[Treatment Ref]')
      .replaceAll('{{staff_name}}', staffName || '[Staff Name]');
  }, [
    selectedTemplate,
    patientName,
    patientRef,
    data.settings.clinicName,
    dentistName,
    appointmentDate,
    treatmentRef,
    staffName,
  ]);

  useEffect(() => {
    setCustomDraft(renderedTemplate);
  }, [renderedTemplate]);

  const handleCopy = async () => {
    const textToCopy = customDraft.trim();
    if (!textToCopy) return;

    let succeeded = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        succeeded = true;
      }
    } catch {
      succeeded = false;
    }

    if (!succeeded) {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        succeeded = document.execCommand('copy');
      } catch {
        succeeded = false;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    if (!succeeded) {
      onNotifyCopyError?.(
        'Clipboard access was blocked by the browser. Please select and copy the message text manually.',
      );
      return;
    }

    setCopied(true);
    onNotifyCopy(selectedTemplate?.title ?? 'Message');
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-[#DCE9E2] bg-[#DCE9E2]/45 px-5 py-3.5 text-sm text-[#203344]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#174C4F]" />
        <p>
          Select a template below, personalise the placeholders, and copy the
          completed message into your clinic’s email or SMS tool.{' '}
          <strong className="font-semibold text-[#174C4F]">
            Dental Loop does not send messages automatically.
          </strong>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="card-surface overflow-hidden rounded-2xl lg:col-span-4">
          <div className="border-b border-[#2D4458] bg-[#203344] px-5 py-4 text-white">
            <h2 className="text-sm font-semibold text-white">
              Message Templates
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              Choose a template to personalise.
            </p>
          </div>
          <div className="divide-y divide-[#E6EAE7]/75">
            {data.templates.map((tpl) => {
              const active = tpl.id === selectedTemplate?.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full px-5 py-3.5 text-left transition-colors ${
                    active
                      ? 'bg-[#DCE9E2]/60 text-[#174C4F]'
                      : 'hover:bg-[#F8F7F2]/80'
                  }`}
                >
                  <div className={`text-sm font-semibold ${active ? 'text-[#174C4F]' : 'text-[#203344]'}`}>
                    {tpl.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#7B8588]">
                    {tpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card-surface overflow-hidden rounded-2xl lg:col-span-8 flex flex-col">
          <div className="border-b border-[#2D4458] bg-[#203344] px-6 py-4 text-white">
            <h2 className="text-base font-semibold text-white">
              {selectedTemplate?.title ?? 'Message Editor'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              Fill placeholders manually or load details from a demonstration patient record.
            </p>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="msg-patient-select"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Load Patient Details
                </label>
                <select
                  id="msg-patient-select"
                  value={selectedPatientId}
                  onChange={(e) => applyPatientPreset(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                >
                  {data.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="msg-staff-name"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Staff Sender Name
                </label>
                <select
                  id="msg-staff-name"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] bg-white px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                >
                  {data.staff.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="msg-patient-name"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Patient Name
                </label>
                <input
                  id="msg-patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-patient-ref"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Patient Reference
                </label>
                <input
                  id="msg-patient-ref"
                  type="text"
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 font-mono text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-dentist-name"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Dentist Name
                </label>
                <input
                  id="msg-dentist-name"
                  type="text"
                  value={dentistName}
                  onChange={(e) => setDentistName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-appt-date"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Appointment / Recall Date
                </label>
                <input
                  id="msg-appt-date"
                  type="text"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  placeholder="e.g. 28 Nov 2026 at 10:30"
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-tr-ref"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Treatment Reference
                </label>
                <input
                  id="msg-tr-ref"
                  type="text"
                  value={treatmentRef}
                  onChange={(e) => setTreatmentRef(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] px-3 py-2 font-mono text-sm text-[#203344] focus:border-[#174C4F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-clinic-name"
                  className="block text-xs font-medium text-[#7B8588]"
                >
                  Clinic Name (from Settings)
                </label>
                <input
                  id="msg-clinic-name"
                  type="text"
                  value={data.settings.clinicName}
                  readOnly
                  className="mt-1 block w-full rounded-lg border border-[#E6EAE7] bg-[#F8F7F2] px-3 py-2 text-sm text-[#7B8588]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="msg-editor"
                  className="block text-xs font-semibold text-[#203344]"
                >
                  Completed Message (Editable)
                </label>
                <button
                  type="button"
                  onClick={() => setCustomDraft(renderedTemplate)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7B8588] hover:text-[#174C4F]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to template
                </button>
              </div>
              <textarea
                id="msg-editor"
                rows={9}
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#E6EAE7] bg-[#F8F7F2]/60 p-4 text-sm leading-relaxed text-[#203344] focus:border-[#174C4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EAE7] pt-4">
              <span className="text-xs text-[#7B8588]">
                Review wording before pasting into your clinic’s communication channel.
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!customDraft.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#174C4F] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#123D40] disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#DCE9E2]" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Completed Message
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
