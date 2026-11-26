export type NavSection =
  | 'overview'
  | 'patients'
  | 'follow-ups'
  | 'treatments'
  | 'recalls'
  | 'messages'
  | 'settings';

export type PatientStatus = 'Active' | 'Needs Follow-Up' | 'Inactive';

export type FollowUpCategory =
  | 'General Follow-Up'
  | 'Treatment Follow-Up'
  | 'Missed Appointment'
  | 'Post-Treatment Check-In'
  | 'Patient Recall';

export type FollowUpStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Rescheduled';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TreatmentStatus =
  | 'Awaiting Contact'
  | 'Follow-Up Scheduled'
  | 'Considering'
  | 'Booked'
  | 'Declined';

export type RecallStatus =
  | 'Due Soon'
  | 'Overdue for Contact'
  | 'Contacted'
  | 'Booked'
  | 'Deferred';

export type TemplateCategory =
  | 'Appointment confirmation'
  | 'Missed appointment follow-up'
  | 'Treatment follow-up'
  | 'Patient recall'
  | 'Post-treatment check-in'
  | 'Appointment rescheduling';

export interface StaffMember {
  id: string;
  name: string;
  role: 'Dentist' | 'Receptionist' | 'Practice Manager' | 'Treatment Coordinator';
}

export interface Patient {
  id: string;
  name: string;
  reference: string;
  phone: string;
  email: string;
  assignedDentist: string;
  registrationDate: string;
  status: PatientStatus;
  notes?: string;
}

export interface FollowUp {
  id: string;
  patientId: string;
  category: FollowUpCategory;
  description: string;
  dueDate: string;
  assignedEmployee: string;
  priority: Priority;
  status: FollowUpStatus;
  createdAt: string;
}

export interface TreatmentItem {
  id: string;
  patientId: string;
  treatmentReference: string;
  treatmentSummary: string;
  dateRecommended: string;
  followUpDate: string;
  assignedEmployee: string;
  estimatedValue?: number;
  status: TreatmentStatus;
}

export interface PatientRecall {
  id: string;
  patientId: string;
  clinicRecallNote: string;
  lastVisitDate: string;
  suggestedContactDate: string;
  assignedEmployee: string;
  status: RecallStatus;
}

export interface MessageTemplate {
  id: string;
  title: TemplateCategory;
  description: string;
  body: string;
}

export interface ClinicSettings {
  clinicName: string;
  country: string;
  currency: 'GBP' | 'USD' | 'EUR' | 'CAD' | 'AUD' | 'NZD';
  timezone: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  detail: string;
  actor: string;
  timestamp: string;
}

export interface ClinicWorkspaceData {
  patients: Patient[];
  followUps: FollowUp[];
  treatments: TreatmentItem[];
  recalls: PatientRecall[];
  templates: MessageTemplate[];
  staff: StaffMember[];
  settings: ClinicSettings;
  recentActivity: ActivityLogEntry[];
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
