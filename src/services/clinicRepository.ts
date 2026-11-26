import type {
  ActivityLogEntry,
  ClinicSettings,
  ClinicWorkspaceData,
  FollowUp,
  Patient,
  PatientRecall,
  TreatmentItem,
} from '../types/dental';

export interface ClinicRepository {
  readonly mode: 'demo' | 'cloudsql';
  loadWorkspace?(): Promise<ClinicWorkspaceData>;
  resetWorkspace?(): Promise<ClinicWorkspaceData>;
  createPatient(patient: Omit<Patient, 'id'>): Promise<Patient>;
  updatePatient(patient: Patient): Promise<Patient>;
  createFollowUp(
    followUp: Omit<FollowUp, 'id' | 'createdAt'>,
    createdAt: string,
  ): Promise<FollowUp>;
  updateFollowUp(followUp: FollowUp): Promise<FollowUp>;
  createTreatment(
    treatment: Omit<TreatmentItem, 'id'>,
  ): Promise<TreatmentItem>;
  updateTreatment(treatment: TreatmentItem): Promise<TreatmentItem>;
  createRecall(recall: Omit<PatientRecall, 'id'>): Promise<PatientRecall>;
  updateRecall(recall: PatientRecall): Promise<PatientRecall>;
  updateSettings(settings: ClinicSettings): Promise<ClinicSettings>;
}

export function createClinicRepository(): ClinicRepository {
  return {
    mode: 'demo',
    async createPatient(patient) {
      return {
        ...patient,
        id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
    },
    async updatePatient(patient) {
      return patient;
    },
    async createFollowUp(followUp, createdAt) {
      return {
        ...followUp,
        id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt,
      };
    },
    async updateFollowUp(followUp) {
      return followUp;
    },
    async createTreatment(treatment) {
      return {
        ...treatment,
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
    },
    async updateTreatment(treatment) {
      return treatment;
    },
    async createRecall(recall) {
      return {
        ...recall,
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
    },
    async updateRecall(recall) {
      return recall;
    },
    async updateSettings(settings) {
      return settings;
    },
  };
}

async function authorizedJson<T>(
  getIdToken: () => Promise<string>,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed.';
    try {
      const payload = (await response.json()) as {error?: string};
      if (payload?.error) message = payload.error;
    } catch {
      // Keep generic error message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function createCloudSqlRepository(
  getIdToken: () => Promise<string>,
): ClinicRepository {
  return {
    mode: 'cloudsql',
    loadWorkspace() {
      return authorizedJson<ClinicWorkspaceData>(getIdToken, '/api/workspace');
    },
    resetWorkspace() {
      return authorizedJson<ClinicWorkspaceData>(
        getIdToken,
        '/api/workspace/reset',
        {method: 'POST'},
      );
    },
    createPatient(patient) {
      return authorizedJson<Patient>(getIdToken, '/api/patients', {
        method: 'POST',
        body: JSON.stringify(patient),
      });
    },
    updatePatient(patient) {
      return authorizedJson<Patient>(
        getIdToken,
        `/api/patients/${encodeURIComponent(patient.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(patient),
        },
      );
    },
    createFollowUp(followUp, createdAt) {
      return authorizedJson<FollowUp>(getIdToken, '/api/follow-ups', {
        method: 'POST',
        body: JSON.stringify({...followUp, createdAt}),
      });
    },
    updateFollowUp(followUp) {
      return authorizedJson<FollowUp>(
        getIdToken,
        `/api/follow-ups/${encodeURIComponent(followUp.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(followUp),
        },
      );
    },
    createTreatment(treatment) {
      return authorizedJson<TreatmentItem>(getIdToken, '/api/treatments', {
        method: 'POST',
        body: JSON.stringify(treatment),
      });
    },
    updateTreatment(treatment) {
      return authorizedJson<TreatmentItem>(
        getIdToken,
        `/api/treatments/${encodeURIComponent(treatment.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(treatment),
        },
      );
    },
    createRecall(recall) {
      return authorizedJson<PatientRecall>(getIdToken, '/api/recalls', {
        method: 'POST',
        body: JSON.stringify(recall),
      });
    },
    updateRecall(recall) {
      return authorizedJson<PatientRecall>(
        getIdToken,
        `/api/recalls/${encodeURIComponent(recall.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(recall),
        },
      );
    },
    updateSettings(settings) {
      return authorizedJson<ClinicSettings>(getIdToken, '/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
  };
}

export function createActivityEntry(
  action: string,
  detail: string,
  actor: string,
): ActivityLogEntry {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    detail,
    actor,
    timestamp: `Today, ${timeStr}`,
  };
}
