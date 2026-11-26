import {relations} from 'drizzle-orm';
import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const clinicSettings = pgTable('clinic_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull()
    .unique(),
  clinicName: text('clinic_name').notNull(),
  country: text('country').notNull(),
  currency: text('currency').notNull(),
  timezone: text('timezone').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staffMembers = pgTable('staff_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  name: text('name').notNull(),
  reference: text('reference').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  assignedDentist: text('assigned_dentist').notNull(),
  registrationDate: text('registration_date').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const followUps = pgTable('follow_ups', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  patientId: integer('patient_id')
    .references(() => patients.id, {onDelete: 'cascade'})
    .notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  dueDate: text('due_date').notNull(),
  assignedEmployee: text('assigned_employee').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

export const treatments = pgTable('treatments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  patientId: integer('patient_id')
    .references(() => patients.id, {onDelete: 'cascade'})
    .notNull(),
  treatmentReference: text('treatment_reference').notNull(),
  treatmentSummary: text('treatment_summary').notNull(),
  dateRecommended: text('date_recommended').notNull(),
  followUpDate: text('follow_up_date').notNull(),
  assignedEmployee: text('assigned_employee').notNull(),
  estimatedValue: integer('estimated_value'),
  status: text('status').notNull(),
});

export const patientRecalls = pgTable('patient_recalls', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  patientId: integer('patient_id')
    .references(() => patients.id, {onDelete: 'cascade'})
    .notNull(),
  clinicRecallNote: text('clinic_recall_note').notNull(),
  lastVisitDate: text('last_visit_date').notNull(),
  suggestedContactDate: text('suggested_contact_date').notNull(),
  assignedEmployee: text('assigned_employee').notNull(),
  status: text('status').notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {onDelete: 'cascade'})
    .notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  actor: text('actor').notNull(),
  timestampLabel: text('timestamp_label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({one, many}) => ({
  settings: one(clinicSettings, {
    fields: [users.id],
    references: [clinicSettings.userId],
  }),
  staffMembers: many(staffMembers),
  patients: many(patients),
  followUps: many(followUps),
  treatments: many(treatments),
  patientRecalls: many(patientRecalls),
  activityLogs: many(activityLogs),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
  owner: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  followUps: many(followUps),
  treatments: many(treatments),
  recalls: many(patientRecalls),
}));

export const followUpsRelations = relations(followUps, ({one}) => ({
  owner: one(users, {
    fields: [followUps.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [followUps.patientId],
    references: [patients.id],
  }),
}));

export const treatmentsRelations = relations(treatments, ({one}) => ({
  owner: one(users, {
    fields: [treatments.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [treatments.patientId],
    references: [patients.id],
  }),
}));

export const patientRecallsRelations = relations(patientRecalls, ({one}) => ({
  owner: one(users, {
    fields: [patientRecalls.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [patientRecalls.patientId],
    references: [patients.id],
  }),
}));
