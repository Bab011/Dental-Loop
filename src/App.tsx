import {onAuthStateChanged, signOut, type User} from 'firebase/auth';
import {
  AlertCircle,
  Bell,
  Calendar,
  Menu,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {AuthPortal} from './components/auth/AuthPortal';
import {Sidebar} from './components/layout/Sidebar';
import {PatientFormModal} from './components/ui/PatientFormModal';
import {ToastStack} from './components/ui/ToastStack';
import {
  FollowUpsView,
  type FollowUpTimeFilter,
} from './components/views/FollowUpsView';
import {MessageCentreView} from './components/views/MessageCentreView';
import {OverviewView} from './components/views/OverviewView';
import {PatientsView} from './components/views/PatientsView';
import {RecallsView} from './components/views/RecallsView';
import {SettingsView} from './components/views/SettingsView';
import {TreatmentsView} from './components/views/TreatmentsView';
import {createInitialDemoData} from './data/demoData';
import {auth} from './lib/firebase';
import {
  createActivityEntry,
  createClinicRepository,
  createCloudSqlRepository,
} from './services/clinicRepository';
import type {
  ClinicSettings,
  ClinicWorkspaceData,
  FollowUp,
  NavSection,
  Patient,
  PatientRecall,
  TemplateCategory,
  ToastNotice,
  TreatmentItem,
} from './types/dental';
import {
  formatRelativeDueLabel,
  getTodayIso,
  isFollowUpOverdue,
  isFollowUpToday,
} from './utils/dateUtils';

const SECTION_META: Record<NavSection, {title: string; subtitle: string}> = {
  overview: {
    title: 'Clinic Overview',
    subtitle: 'Daily follow-ups, unbooked treatments, and upcoming patient recalls.',
  },
  patients: {
    title: 'Patient Directory',
    subtitle: 'Fictional demonstration patient records and clinic assignments.',
  },
  'follow-ups': {
    title: 'Follow-Ups',
    subtitle: 'Track general follow-ups, missed appointments, and check-ins.',
  },
  treatments: {
    title: 'Treatment Tracker',
    subtitle: 'Monitor clinic-recommended treatments awaiting patient booking.',
  },
  recalls: {
    title: 'Patient Recall',
    subtitle: 'Manage clinic-determined routine recall contact dates and statuses.',
  },
  messages: {
    title: 'Message Centre',
    subtitle: 'Personalise message templates and copy completed wording for patients.',
  },
  settings: {
    title: 'Clinic Settings',
    subtitle: 'Configure clinic identity, currency, and timezone preferences.',
  },
};

function getTimeGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function getFormattedHeaderDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const repository = useMemo(
    () =>
      authUser
        ? createCloudSqlRepository(() => authUser.getIdToken())
        : createClinicRepository(),
    [authUser],
  );

  const [data, setData] = useState<ClinicWorkspaceData>(() =>
    createInitialDemoData(),
  );
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showAuthPortal, setShowAuthPortal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [listSearchQuery, setListSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [followUpTimeFilter, setFollowUpTimeFilter] =
    useState<FollowUpTimeFilter>('all');
  const [followUpCategoryFilter, setFollowUpCategoryFilter] =
    useState<string>('All');
  const [followUpCreateTrigger, setFollowUpCreateTrigger] = useState(0);
  const [messageContext, setMessageContext] = useState<{
    patientId?: string;
    templateTitle?: TemplateCategory;
    treatmentRef?: string;
  }>({});

  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [notificationsOpen]);

  const pushToast = useCallback(
    (type: ToastNotice['type'], message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, {id, type, message}]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      setAuthUser(user);
      if (!user) {
        setData(createInitialDemoData());
        return;
      }

      setWorkspaceLoading(true);
      try {
        const cloudRepo = createCloudSqlRepository(() => user.getIdToken());
        if (cloudRepo.loadWorkspace) {
          const loaded = await cloudRepo.loadWorkspace();
          if (!cancelled) {
            setData(loaded);
            setShowAuthPortal(false);
          }
        }
      } catch {
        if (!cancelled) {
          pushToast(
            'error',
            'Unable to load your saved clinic workspace. Showing demonstration data.',
          );
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pushToast]);

  const patientMap = useMemo(
    () => new Map(data.patients.map((p) => [p.id, p])),
    [data.patients],
  );

  const urgentItems = useMemo(() => {
    return data.followUps
      .filter(
        (f) =>
          isFollowUpOverdue(f.dueDate, f.status) ||
          isFollowUpToday(f.dueDate, f.status),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [data.followUps]);

  const attentionCount = urgentItems.length;

  const handleNavigate = (
    section: NavSection,
    options?: {
      followUpFilter?: FollowUpTimeFilter;
      followUpCategory?: string;
      openCreateModal?: boolean;
      patientId?: string;
      templateTitle?: TemplateCategory;
      treatmentRef?: string;
    },
  ) => {
    if (section === 'follow-ups') {
      setFollowUpTimeFilter(options?.followUpFilter ?? 'all');
      setFollowUpCategoryFilter(options?.followUpCategory ?? 'All');
      if (options?.openCreateModal) {
        setFollowUpCreateTrigger((prev) => prev + 1);
      }
    }
    if (section === 'messages') {
      setMessageContext({
        patientId: options?.patientId,
        templateTitle: options?.templateTitle,
        treatmentRef: options?.treatmentRef,
      });
    }
    setNotificationsOpen(false);
    setActiveSection(section);
  };

  const activeStaffName =
    authUser?.displayName?.trim() ||
    authUser?.email?.split('@')[0] ||
    'Claire Morris';
  const activeStaffEmail =
    authUser?.email || 'claire.morris@harbourview-demo.example';
  const greetingFirstName = activeStaffName.split(/\s+/)[0] || 'Claire';

  const handleAddPatient = async (
    patientInput: Omit<Patient, 'id'>,
  ): Promise<boolean> => {
    try {
      const created = await repository.createPatient(patientInput);
      setData((prev) => ({
        ...prev,
        patients: [created, ...prev.patients],
        recentActivity: [
          createActivityEntry(
            'Patient added',
            `${created.name} (${created.reference}) added to directory`,
            activeStaffName,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', `${created.name} added to patient directory.`);
      return true;
    } catch {
      pushToast('error', 'Could not add patient record. Please try again.');
      return false;
    }
  };

  const handleUpdatePatient = async (
    updatedPatient: Patient,
  ): Promise<boolean> => {
    try {
      const saved = await repository.updatePatient(updatedPatient);
      setData((prev) => ({
        ...prev,
        patients: prev.patients.map((p) => (p.id === saved.id ? saved : p)),
        recentActivity: [
          createActivityEntry(
            'Patient updated',
            `${saved.name} (${saved.reference}) record updated`,
            activeStaffName,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', `${saved.name} record saved.`);
      return true;
    } catch {
      pushToast('error', 'Could not update patient record.');
      return false;
    }
  };

  const handleAddFollowUp = async (
    followUpInput: Omit<FollowUp, 'id' | 'createdAt'>,
  ): Promise<boolean> => {
    try {
      const created = await repository.createFollowUp(
        followUpInput,
        getTodayIso(),
      );
      const patient = data.patients.find((p) => p.id === created.patientId);
      setData((prev) => ({
        ...prev,
        followUps: [created, ...prev.followUps],
        recentActivity: [
          createActivityEntry(
            'Follow-up created',
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — ${created.category}`,
            created.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', 'Follow-up activity created.');
      return true;
    } catch {
      pushToast('error', 'Could not create follow-up activity.');
      return false;
    }
  };

  const handleUpdateFollowUp = async (
    updatedFollowUp: FollowUp,
  ): Promise<boolean> => {
    try {
      const saved = await repository.updateFollowUp(updatedFollowUp);
      const patient = data.patients.find((p) => p.id === saved.patientId);
      setData((prev) => ({
        ...prev,
        followUps: prev.followUps.map((f) => (f.id === saved.id ? saved : f)),
        recentActivity: [
          createActivityEntry(
            `Follow-up ${saved.status.toLowerCase()}`,
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — ${saved.category}`,
            saved.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast(
        'success',
        `Follow-up for ${patient?.name ?? 'patient'} marked as ${saved.status}.`,
      );
      return true;
    } catch {
      pushToast('error', 'Could not update follow-up.');
      return false;
    }
  };

  const handleAddTreatment = async (
    treatmentInput: Omit<TreatmentItem, 'id'>,
  ): Promise<boolean> => {
    try {
      const created = await repository.createTreatment(treatmentInput);
      const patient = data.patients.find((p) => p.id === created.patientId);
      setData((prev) => ({
        ...prev,
        treatments: [created, ...prev.treatments],
        recentActivity: [
          createActivityEntry(
            'Treatment plan tracked',
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — ${created.treatmentReference}`,
            created.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', `${created.treatmentReference} added to Treatment Tracker.`);
      return true;
    } catch {
      pushToast('error', 'Could not add treatment tracker item.');
      return false;
    }
  };

  const handleUpdateTreatment = async (
    updatedTreatment: TreatmentItem,
  ): Promise<boolean> => {
    try {
      const saved = await repository.updateTreatment(updatedTreatment);
      const patient = data.patients.find((p) => p.id === saved.patientId);
      setData((prev) => ({
        ...prev,
        treatments: prev.treatments.map((t) => (t.id === saved.id ? saved : t)),
        recentActivity: [
          createActivityEntry(
            'Treatment status updated',
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — ${saved.treatmentReference} marked as ${saved.status}`,
            saved.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', `${saved.treatmentReference} updated to ${saved.status}.`);
      return true;
    } catch {
      pushToast('error', 'Could not update treatment tracker item.');
      return false;
    }
  };

  const handleAddRecall = async (
    recallInput: Omit<PatientRecall, 'id'>,
  ): Promise<boolean> => {
    try {
      const created = await repository.createRecall(recallInput);
      const patient = data.patients.find((p) => p.id === created.patientId);
      setData((prev) => ({
        ...prev,
        recalls: [created, ...prev.recalls],
        recentActivity: [
          createActivityEntry(
            'Recall scheduled',
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — Contact date set`,
            created.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', 'Patient recall schedule added.');
      return true;
    } catch {
      pushToast('error', 'Could not add recall schedule.');
      return false;
    }
  };

  const handleUpdateRecall = async (
    updatedRecall: PatientRecall,
  ): Promise<boolean> => {
    try {
      const saved = await repository.updateRecall(updatedRecall);
      const patient = data.patients.find((p) => p.id === saved.patientId);
      setData((prev) => ({
        ...prev,
        recalls: prev.recalls.map((r) => (r.id === saved.id ? saved : r)),
        recentActivity: [
          createActivityEntry(
            'Recall updated',
            `${patient?.name ?? 'Patient'} (${patient?.reference ?? '—'}) — ${saved.status}`,
            saved.assignedEmployee,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', `Recall updated for ${patient?.name ?? 'patient'}.`);
      return true;
    } catch {
      pushToast('error', 'Could not update patient recall.');
      return false;
    }
  };

  const handleSaveSettings = async (
    newSettings: ClinicSettings,
  ): Promise<boolean> => {
    try {
      const saved = await repository.updateSettings(newSettings);
      setData((prev) => ({
        ...prev,
        settings: saved,
        recentActivity: [
          createActivityEntry(
            'Clinic settings saved',
            `${saved.clinicName} · ${saved.currency} · ${saved.timezone}`,
            activeStaffName,
          ),
          ...prev.recentActivity,
        ],
      }));
      pushToast('success', 'Clinic settings saved.');
      return true;
    } catch {
      pushToast('error', 'Could not save clinic settings.');
      return false;
    }
  };

  const handleResetDemo = async () => {
    setNotificationsOpen(false);
    if (repository.resetWorkspace) {
      try {
        const resetData = await repository.resetWorkspace();
        setData(resetData);
        pushToast('info', 'Clinic workspace restored to initial demonstration records.');
      } catch {
        pushToast('error', 'Could not reset clinic workspace. Please try again.');
      }
      return;
    }
    setData(createInitialDemoData());
    pushToast('info', 'Demonstration clinic data restored to initial records.');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setNotificationsOpen(false);
      pushToast('info', 'Signed out. Returned to demonstration mode.');
    } catch {
      pushToast('error', 'Could not sign out cleanly.');
    }
  };

  if (showAuthPortal) {
    return (
      <>
        <AuthPortal
          clinicName={data.settings.clinicName}
          onEnterDemoWorkspace={() => setShowAuthPortal(false)}
          onSignedIn={() => {
            setShowAuthPortal(false);
            pushToast('success', 'Signed in with Google.');
          }}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const meta = SECTION_META[activeSection];
  const headerDate = getFormattedHeaderDate();

  const headerSearchPlaceholder =
    activeSection === 'patients'
      ? 'Filter patients by name or ref...'
      : activeSection === 'follow-ups'
        ? 'Filter follow-ups by name or ref...'
        : activeSection === 'treatments'
          ? 'Filter treatments by name or ref...'
          : 'Search patient name or ref...';

  const handleHeaderSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (
      activeSection !== 'patients' &&
      activeSection !== 'follow-ups' &&
      activeSection !== 'treatments'
    ) {
      handleNavigate('patients');
    }
  };

  return (
    <div className="min-h-screen bg-[#EAE7DF] text-[#203344]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => handleNavigate(sec)}
        clinicName={data.settings.clinicName}
        attentionCount={attentionCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onOpenAuthPortal={() => setShowAuthPortal(true)}
        onSignOut={handleSignOut}
        isAuthenticated={Boolean(authUser)}
        activeStaffName={activeStaffName}
        activeStaffEmail={activeStaffEmail}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#D8DED9] bg-[#F8F7F2]/95 backdrop-blur-xs">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 lg:px-8 xl:flex-nowrap">
            <div className="flex min-w-[200px] flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8DED9] bg-white text-[#203344] hover:bg-[#DCE9E2]/40 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-[#203344] sm:text-xl">
                  {activeSection === 'overview'
                    ? getTimeGreeting(greetingFirstName)
                    : meta.title}
                </h1>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[#7B8588]">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-[#174C4F]">
                    <Calendar className="h-3.5 w-3.5 text-[#174C4F]" />
                    {headerDate}
                  </span>
                  {activeSection !== 'overview' && (
                    <>
                      <span aria-hidden="true" className="hidden sm:inline text-[#C8D0CC]">
                        ·
                      </span>
                      <span className="hidden truncate sm:inline">{meta.subtitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleHeaderSearchSubmit}
              role="search"
              className="order-last w-full xl:order-none xl:w-56 xl:shrink-0 2xl:w-64"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7B8588]" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder={headerSearchPlaceholder}
                  aria-label="Filter by name or reference number"
                  className="h-9 w-full rounded-lg border border-[#D8DED9] bg-white pl-8.5 pr-8 text-xs text-[#203344] placeholder:text-[#7B8588] transition-colors focus:border-[#174C4F] focus:outline-none focus:ring-2 focus:ring-[#174C4F]/15"
                />
                {listSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setListSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#7B8588] hover:bg-[#F4F2EC] hover:text-[#203344]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>

            <div className="ml-auto flex flex-wrap shrink-0 items-center justify-end gap-2 sm:flex-nowrap sm:gap-2.5">
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  aria-expanded={notificationsOpen}
                  aria-label="Open follow-up alerts"
                  className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8DED9] bg-white px-3 text-xs font-medium text-[#203344] transition-colors hover:border-[#174C4F]/40 hover:bg-[#DCE9E2]/40"
                >
                  <Bell className="h-4 w-4 text-[#174C4F]" />
                  <span className="hidden sm:inline">Alerts</span>
                  {attentionCount > 0 && (
                    <span className="tabular-nums rounded-md bg-[#C75C5C] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {attentionCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="fixed inset-x-4 top-[72px] z-30 overflow-hidden rounded-2xl border border-[#2D4458] bg-white shadow-[0_14px_36px_rgba(32,51,68,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
                    <div className="flex items-center justify-between border-b border-[#2D4458] bg-[#203344] px-4 py-3 text-white">
                      <span className="text-xs font-semibold">
                        Follow-Up Alerts ({attentionCount})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigate('follow-ups', {followUpFilter: 'overdue'})
                        }
                        className="text-xs font-semibold text-[#DCE9E2] hover:underline"
                      >
                        Open Queue
                      </button>
                    </div>
                    {urgentItems.length === 0 ? (
                      <div className="px-4 py-5 text-center text-xs text-[#7B8588]">
                        No overdue or due-today follow-ups right now.
                      </div>
                    ) : (
                      <ul className="max-h-72 divide-y divide-[#DCE1DD]/75 overflow-y-auto">
                        {urgentItems.map((item) => {
                          const patient = patientMap.get(item.patientId);
                          const overdue = isFollowUpOverdue(
                            item.dueDate,
                            item.status,
                          );
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleNavigate('follow-ups', {
                                    followUpFilter: overdue ? 'overdue' : 'today',
                                  })
                                }
                                className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#F8F7F2]"
                              >
                                <AlertCircle
                                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                                    overdue ? 'text-[#C75C5C]' : 'text-[#D99A38]'
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-xs font-semibold text-[#203344]">
                                      {patient?.name ?? 'Patient'}
                                    </span>
                                    <span
                                      className={`text-[11px] font-medium tabular-nums whitespace-nowrap ${
                                        overdue
                                          ? 'text-[#C75C5C]'
                                          : 'text-[#B57D22]'
                                      }`}
                                    >
                                      {formatRelativeDueLabel(
                                        item.dueDate,
                                        item.status,
                                      )}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-[#7B8588]">
                                    {item.category} · {item.description}
                                  </p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetDemo}
                title="Reset demonstration records"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D8DED9] bg-white px-3 text-xs font-medium text-[#203344]/80 transition-colors hover:bg-[#F4F2EC] hover:text-[#203344] whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Reset Demo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  setQuickAddOpen(true);
                }}
                title="Add a new fictional patient"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#174C4F] px-3 text-xs font-medium text-white transition-colors hover:bg-[#123D40] whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Quick Add</span>
              </button>

              {activeSection === 'overview' && (
                <button
                  type="button"
                  onClick={() =>
                    handleNavigate('follow-ups', {
                      followUpFilter: 'all',
                      openCreateModal: true,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#203344] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#174C4F] whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Follow-Up</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {workspaceLoading ? (
            <div className="card-surface flex items-center justify-center rounded-2xl px-6 py-16 text-sm font-medium text-[#7B8588]">
              Loading clinic workspace...
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewView
                  data={data}
                  onNavigate={handleNavigate}
                  onCompleteFollowUp={(item) =>
                    handleUpdateFollowUp({...item, status: 'Completed'})
                  }
                />
              )}

          {activeSection === 'patients' && (
            <PatientsView
              data={data}
              searchQuery={listSearchQuery}
              onChangeSearchQuery={setListSearchQuery}
              onAddPatient={handleAddPatient}
              onUpdatePatient={handleUpdatePatient}
            />
          )}

          {activeSection === 'follow-ups' && (
            <FollowUpsView
              data={data}
              searchQuery={listSearchQuery}
              onChangeSearchQuery={setListSearchQuery}
              timeFilter={followUpTimeFilter}
              onChangeTimeFilter={setFollowUpTimeFilter}
              categoryFilter={followUpCategoryFilter}
              onChangeCategoryFilter={setFollowUpCategoryFilter}
              openCreateTrigger={followUpCreateTrigger}
              onConsumeCreateTrigger={() => setFollowUpCreateTrigger(0)}
              onAddFollowUp={handleAddFollowUp}
              onUpdateFollowUp={handleUpdateFollowUp}
              onOpenMessage={(patientId, templateTitle) =>
                handleNavigate('messages', {patientId, templateTitle})
              }
            />
          )}

          {activeSection === 'treatments' && (
            <TreatmentsView
              data={data}
              searchQuery={listSearchQuery}
              onChangeSearchQuery={setListSearchQuery}
              onAddTreatment={handleAddTreatment}
              onUpdateTreatment={handleUpdateTreatment}
              onOpenMessage={(patientId, templateTitle, treatmentRef) =>
                handleNavigate('messages', {
                  patientId,
                  templateTitle,
                  treatmentRef,
                })
              }
            />
          )}

          {activeSection === 'recalls' && (
            <RecallsView
              data={data}
              onAddRecall={handleAddRecall}
              onUpdateRecall={handleUpdateRecall}
              onOpenMessage={(patientId, templateTitle) =>
                handleNavigate('messages', {patientId, templateTitle})
              }
            />
          )}

          {activeSection === 'messages' && (
            <MessageCentreView
              data={data}
              initialPatientId={messageContext.patientId}
              initialTemplateTitle={messageContext.templateTitle}
              initialTreatmentRef={messageContext.treatmentRef}
              onNotifyCopy={(title) =>
                pushToast('success', `${title} copied to clipboard.`)
              }
              onNotifyCopyError={(message) => pushToast('error', message)}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={data.settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
            </>
          )}
        </main>
      </div>

      <PatientFormModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        patients={data.patients}
        staff={data.staff}
        onAddPatient={handleAddPatient}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
