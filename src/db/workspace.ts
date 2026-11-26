import {and, desc, eq} from 'drizzle-orm';
import {createInitialDemoData} from '../data/demoData.ts';
import type {
  ActivityLogEntry,
  ClinicSettings,
  ClinicWorkspaceData,
  FollowUp,
  Patient,
  PatientRecall,
  StaffMember,
  TreatmentItem,
} from '../types/dental.ts';
import {db} from './index.ts';
import {
  activityLogs,
  clinicSettings,
  followUps,
  patientRecalls,
  patients,
  staffMembers,
  treatments,
} from './schema.ts';

function formatActivityTimestamp(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Today, ${timeStr}`;
}

async function seedWorkspaceForUser(userId: number): Promise<void> {
  const demo = createInitialDemoData();

  await db.transaction(async (tx) => {
    await tx.delete(activityLogs).where(eq(activityLogs.userId, userId));
    await tx.delete(patientRecalls).where(eq(patientRecalls.userId, userId));
    await tx.delete(treatments).where(eq(treatments.userId, userId));
    await tx.delete(followUps).where(eq(followUps.userId, userId));
    await tx.delete(patients).where(eq(patients.userId, userId));
    await tx.delete(staffMembers).where(eq(staffMembers.userId, userId));
    await tx.delete(clinicSettings).where(eq(clinicSettings.userId, userId));

    await tx.insert(clinicSettings).values({
      userId,
      clinicName: demo.settings.clinicName,
      country: demo.settings.country,
      currency: demo.settings.currency,
      timezone: demo.settings.timezone,
    });

    await tx.insert(staffMembers).values(
      demo.staff.map((member) => ({
        userId,
        name: member.name,
        role: member.role,
      })),
    );

    const patientIdMap = new Map<string, number>();
    for (const pat of demo.patients) {
      const [inserted] = await tx
        .insert(patients)
        .values({
          userId,
          name: pat.name,
          reference: pat.reference,
          phone: pat.phone,
          email: pat.email,
          assignedDentist: pat.assignedDentist,
          registrationDate: pat.registrationDate,
          status: pat.status,
          notes: pat.notes ?? '',
        })
        .returning({id: patients.id});
      patientIdMap.set(pat.id, inserted.id);
    }

    for (const fu of demo.followUps) {
      const mappedPatientId = patientIdMap.get(fu.patientId);
      if (!mappedPatientId) continue;
      await tx.insert(followUps).values({
        userId,
        patientId: mappedPatientId,
        category: fu.category,
        description: fu.description,
        dueDate: fu.dueDate,
        assignedEmployee: fu.assignedEmployee,
        priority: fu.priority,
        status: fu.status,
        createdAt: fu.createdAt,
      });
    }

    for (const tr of demo.treatments) {
      const mappedPatientId = patientIdMap.get(tr.patientId);
      if (!mappedPatientId) continue;
      await tx.insert(treatments).values({
        userId,
        patientId: mappedPatientId,
        treatmentReference: tr.treatmentReference,
        treatmentSummary: tr.treatmentSummary,
        dateRecommended: tr.dateRecommended,
        followUpDate: tr.followUpDate,
        assignedEmployee: tr.assignedEmployee,
        estimatedValue: tr.estimatedValue ?? null,
        status: tr.status,
      });
    }

    for (const rec of demo.recalls) {
      const mappedPatientId = patientIdMap.get(rec.patientId);
      if (!mappedPatientId) continue;
      await tx.insert(patientRecalls).values({
        userId,
        patientId: mappedPatientId,
        clinicRecallNote: rec.clinicRecallNote,
        lastVisitDate: rec.lastVisitDate,
        suggestedContactDate: rec.suggestedContactDate,
        assignedEmployee: rec.assignedEmployee,
        status: rec.status,
      });
    }

    for (const entry of demo.recentActivity) {
      await tx.insert(activityLogs).values({
        userId,
        action: entry.action,
        detail: entry.detail,
        actor: entry.actor,
        timestampLabel: entry.timestamp,
      });
    }
  });
}

async function logActivity(
  userId: number,
  action: string,
  detail: string,
  actor: string,
): Promise<ActivityLogEntry> {
  const timestampLabel = formatActivityTimestamp();
  const [inserted] = await db
    .insert(activityLogs)
    .values({
      userId,
      action,
      detail,
      actor,
      timestampLabel,
    })
    .returning();

  return {
    id: String(inserted.id),
    action: inserted.action,
    detail: inserted.detail,
    actor: inserted.actor,
    timestamp: inserted.timestampLabel,
  };
}

export async function getWorkspaceForUser(
  userId: number,
): Promise<ClinicWorkspaceData> {
  try {
    const existingSettings = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.userId, userId));

    if (existingSettings.length === 0) {
      await seedWorkspaceForUser(userId);
    }

    const [
      settingsRows,
      staffRows,
      patientRows,
      followUpRows,
      treatmentRows,
      recallRows,
      activityRows,
    ] = await Promise.all([
      db.select().from(clinicSettings).where(eq(clinicSettings.userId, userId)),
      db.select().from(staffMembers).where(eq(staffMembers.userId, userId)),
      db
        .select()
        .from(patients)
        .where(eq(patients.userId, userId))
        .orderBy(desc(patients.id)),
      db
        .select()
        .from(followUps)
        .where(eq(followUps.userId, userId))
        .orderBy(desc(followUps.id)),
      db
        .select()
        .from(treatments)
        .where(eq(treatments.userId, userId))
        .orderBy(desc(treatments.id)),
      db
        .select()
        .from(patientRecalls)
        .where(eq(patientRecalls.userId, userId))
        .orderBy(desc(patientRecalls.id)),
      db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .orderBy(desc(activityLogs.id))
        .limit(25),
    ]);

    const demo = createInitialDemoData();
    const s = settingsRows[0];

    return {
      settings: s
        ? {
            clinicName: s.clinicName,
            country: s.country,
            currency: s.currency as ClinicSettings['currency'],
            timezone: s.timezone,
          }
        : demo.settings,
      staff: staffRows.map((row) => ({
        id: String(row.id),
        name: row.name,
        role: row.role as StaffMember['role'],
      })),
      patients: patientRows.map((row) => ({
        id: String(row.id),
        name: row.name,
        reference: row.reference,
        phone: row.phone,
        email: row.email,
        assignedDentist: row.assignedDentist,
        registrationDate: row.registrationDate,
        status: row.status as Patient['status'],
        notes: row.notes ?? '',
      })),
      followUps: followUpRows.map((row) => ({
        id: String(row.id),
        patientId: String(row.patientId),
        category: row.category as FollowUp['category'],
        description: row.description,
        dueDate: row.dueDate,
        assignedEmployee: row.assignedEmployee,
        priority: row.priority as FollowUp['priority'],
        status: row.status as FollowUp['status'],
        createdAt: row.createdAt,
      })),
      treatments: treatmentRows.map((row) => ({
        id: String(row.id),
        patientId: String(row.patientId),
        treatmentReference: row.treatmentReference,
        treatmentSummary: row.treatmentSummary,
        dateRecommended: row.dateRecommended,
        followUpDate: row.followUpDate,
        assignedEmployee: row.assignedEmployee,
        estimatedValue: row.estimatedValue ?? undefined,
        status: row.status as TreatmentItem['status'],
      })),
      recalls: recallRows.map((row) => ({
        id: String(row.id),
        patientId: String(row.patientId),
        clinicRecallNote: row.clinicRecallNote,
        lastVisitDate: row.lastVisitDate,
        suggestedContactDate: row.suggestedContactDate,
        assignedEmployee: row.assignedEmployee,
        status: row.status as PatientRecall['status'],
      })),
      templates: demo.templates,
      recentActivity: activityRows.map((row) => ({
        id: String(row.id),
        action: row.action,
        detail: row.detail,
        actor: row.actor,
        timestamp: row.timestampLabel,
      })),
    };
  } catch (error) {
    console.error('Failed to load clinic workspace:', error);
    throw new Error('Failed to load clinic workspace.', {cause: error});
  }
}

export async function resetWorkspaceForUser(
  userId: number,
): Promise<ClinicWorkspaceData> {
  try {
    await seedWorkspaceForUser(userId);
    return await getWorkspaceForUser(userId);
  } catch (error) {
    console.error('Failed to reset clinic workspace:', error);
    throw new Error('Failed to reset clinic workspace.', {cause: error});
  }
}

export async function createPatientRecord(
  userId: number,
  input: Omit<Patient, 'id'>,
  actor: string,
): Promise<Patient> {
  try {
    const [inserted] = await db
      .insert(patients)
      .values({
        userId,
        name: input.name,
        reference: input.reference,
        phone: input.phone,
        email: input.email,
        assignedDentist: input.assignedDentist,
        registrationDate: input.registrationDate,
        status: input.status,
        notes: input.notes ?? '',
      })
      .returning();

    await logActivity(
      userId,
      'Patient added',
      `${inserted.name} (${inserted.reference}) added to directory`,
      actor,
    );

    return {
      id: String(inserted.id),
      name: inserted.name,
      reference: inserted.reference,
      phone: inserted.phone,
      email: inserted.email,
      assignedDentist: inserted.assignedDentist,
      registrationDate: inserted.registrationDate,
      status: inserted.status as Patient['status'],
      notes: inserted.notes ?? '',
    };
  } catch (error) {
    console.error('Failed to create patient:', error);
    throw new Error('Failed to save patient record.', {cause: error});
  }
}

export async function updatePatientRecord(
  userId: number,
  patientId: number,
  input: Omit<Patient, 'id'>,
  actor: string,
): Promise<Patient | null> {
  try {
    const [updated] = await db
      .update(patients)
      .set({
        name: input.name,
        reference: input.reference,
        phone: input.phone,
        email: input.email,
        assignedDentist: input.assignedDentist,
        registrationDate: input.registrationDate,
        status: input.status,
        notes: input.notes ?? '',
      })
      .where(and(eq(patients.id, patientId), eq(patients.userId, userId)))
      .returning();

    if (!updated) return null;

    await logActivity(
      userId,
      'Patient updated',
      `${updated.name} (${updated.reference}) record updated`,
      actor,
    );

    return {
      id: String(updated.id),
      name: updated.name,
      reference: updated.reference,
      phone: updated.phone,
      email: updated.email,
      assignedDentist: updated.assignedDentist,
      registrationDate: updated.registrationDate,
      status: updated.status as Patient['status'],
      notes: updated.notes ?? '',
    };
  } catch (error) {
    console.error('Failed to update patient:', error);
    throw new Error('Failed to update patient record.', {cause: error});
  }
}

async function getOwnedPatient(userId: number, patientId: number) {
  const rows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.userId, userId)));
  return rows[0] ?? null;
}

export async function createFollowUpRecord(
  userId: number,
  input: Omit<FollowUp, 'id' | 'createdAt'>,
  createdAt: string,
): Promise<FollowUp | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [inserted] = await db
      .insert(followUps)
      .values({
        userId,
        patientId: numericPatientId,
        category: input.category,
        description: input.description,
        dueDate: input.dueDate,
        assignedEmployee: input.assignedEmployee,
        priority: input.priority,
        status: input.status,
        createdAt,
      })
      .returning();

    await logActivity(
      userId,
      'Follow-up created',
      `${patient.name} (${patient.reference}) — ${inserted.category}`,
      inserted.assignedEmployee,
    );

    return {
      id: String(inserted.id),
      patientId: String(inserted.patientId),
      category: inserted.category as FollowUp['category'],
      description: inserted.description,
      dueDate: inserted.dueDate,
      assignedEmployee: inserted.assignedEmployee,
      priority: inserted.priority as FollowUp['priority'],
      status: inserted.status as FollowUp['status'],
      createdAt: inserted.createdAt,
    };
  } catch (error) {
    console.error('Failed to create follow-up:', error);
    throw new Error('Failed to create follow-up activity.', {cause: error});
  }
}

export async function updateFollowUpRecord(
  userId: number,
  followUpId: number,
  input: Omit<FollowUp, 'id'>,
): Promise<FollowUp | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [updated] = await db
      .update(followUps)
      .set({
        patientId: numericPatientId,
        category: input.category,
        description: input.description,
        dueDate: input.dueDate,
        assignedEmployee: input.assignedEmployee,
        priority: input.priority,
        status: input.status,
      })
      .where(and(eq(followUps.id, followUpId), eq(followUps.userId, userId)))
      .returning();

    if (!updated) return null;

    await logActivity(
      userId,
      `Follow-up ${updated.status.toLowerCase()}`,
      `${patient.name} (${patient.reference}) — ${updated.category}`,
      updated.assignedEmployee,
    );

    return {
      id: String(updated.id),
      patientId: String(updated.patientId),
      category: updated.category as FollowUp['category'],
      description: updated.description,
      dueDate: updated.dueDate,
      assignedEmployee: updated.assignedEmployee,
      priority: updated.priority as FollowUp['priority'],
      status: updated.status as FollowUp['status'],
      createdAt: updated.createdAt,
    };
  } catch (error) {
    console.error('Failed to update follow-up:', error);
    throw new Error('Failed to update follow-up activity.', {cause: error});
  }
}

export async function createTreatmentRecord(
  userId: number,
  input: Omit<TreatmentItem, 'id'>,
): Promise<TreatmentItem | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [inserted] = await db
      .insert(treatments)
      .values({
        userId,
        patientId: numericPatientId,
        treatmentReference: input.treatmentReference,
        treatmentSummary: input.treatmentSummary,
        dateRecommended: input.dateRecommended,
        followUpDate: input.followUpDate,
        assignedEmployee: input.assignedEmployee,
        estimatedValue: input.estimatedValue ?? null,
        status: input.status,
      })
      .returning();

    await logActivity(
      userId,
      'Treatment plan tracked',
      `${patient.name} (${patient.reference}) — ${inserted.treatmentReference}`,
      inserted.assignedEmployee,
    );

    return {
      id: String(inserted.id),
      patientId: String(inserted.patientId),
      treatmentReference: inserted.treatmentReference,
      treatmentSummary: inserted.treatmentSummary,
      dateRecommended: inserted.dateRecommended,
      followUpDate: inserted.followUpDate,
      assignedEmployee: inserted.assignedEmployee,
      estimatedValue: inserted.estimatedValue ?? undefined,
      status: inserted.status as TreatmentItem['status'],
    };
  } catch (error) {
    console.error('Failed to create treatment:', error);
    throw new Error('Failed to create treatment tracker item.', {cause: error});
  }
}

export async function updateTreatmentRecord(
  userId: number,
  treatmentId: number,
  input: Omit<TreatmentItem, 'id'>,
): Promise<TreatmentItem | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [updated] = await db
      .update(treatments)
      .set({
        patientId: numericPatientId,
        treatmentReference: input.treatmentReference,
        treatmentSummary: input.treatmentSummary,
        dateRecommended: input.dateRecommended,
        followUpDate: input.followUpDate,
        assignedEmployee: input.assignedEmployee,
        estimatedValue: input.estimatedValue ?? null,
        status: input.status,
      })
      .where(and(eq(treatments.id, treatmentId), eq(treatments.userId, userId)))
      .returning();

    if (!updated) return null;

    await logActivity(
      userId,
      'Treatment status updated',
      `${patient.name} (${patient.reference}) — ${updated.treatmentReference} marked as ${updated.status}`,
      updated.assignedEmployee,
    );

    return {
      id: String(updated.id),
      patientId: String(updated.patientId),
      treatmentReference: updated.treatmentReference,
      treatmentSummary: updated.treatmentSummary,
      dateRecommended: updated.dateRecommended,
      followUpDate: updated.followUpDate,
      assignedEmployee: updated.assignedEmployee,
      estimatedValue: updated.estimatedValue ?? undefined,
      status: updated.status as TreatmentItem['status'],
    };
  } catch (error) {
    console.error('Failed to update treatment:', error);
    throw new Error('Failed to update treatment tracker item.', {cause: error});
  }
}

export async function createRecallRecord(
  userId: number,
  input: Omit<PatientRecall, 'id'>,
): Promise<PatientRecall | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [inserted] = await db
      .insert(patientRecalls)
      .values({
        userId,
        patientId: numericPatientId,
        clinicRecallNote: input.clinicRecallNote,
        lastVisitDate: input.lastVisitDate,
        suggestedContactDate: input.suggestedContactDate,
        assignedEmployee: input.assignedEmployee,
        status: input.status,
      })
      .returning();

    await logActivity(
      userId,
      'Recall scheduled',
      `${patient.name} (${patient.reference}) — Contact date set`,
      inserted.assignedEmployee,
    );

    return {
      id: String(inserted.id),
      patientId: String(inserted.patientId),
      clinicRecallNote: inserted.clinicRecallNote,
      lastVisitDate: inserted.lastVisitDate,
      suggestedContactDate: inserted.suggestedContactDate,
      assignedEmployee: inserted.assignedEmployee,
      status: inserted.status as PatientRecall['status'],
    };
  } catch (error) {
    console.error('Failed to create recall:', error);
    throw new Error('Failed to schedule patient recall.', {cause: error});
  }
}

export async function updateRecallRecord(
  userId: number,
  recallId: number,
  input: Omit<PatientRecall, 'id'>,
): Promise<PatientRecall | null> {
  try {
    const numericPatientId = Number(input.patientId);
    if (!Number.isInteger(numericPatientId)) return null;
    const patient = await getOwnedPatient(userId, numericPatientId);
    if (!patient) return null;

    const [updated] = await db
      .update(patientRecalls)
      .set({
        patientId: numericPatientId,
        clinicRecallNote: input.clinicRecallNote,
        lastVisitDate: input.lastVisitDate,
        suggestedContactDate: input.suggestedContactDate,
        assignedEmployee: input.assignedEmployee,
        status: input.status,
      })
      .where(
        and(eq(patientRecalls.id, recallId), eq(patientRecalls.userId, userId)),
      )
      .returning();

    if (!updated) return null;

    await logActivity(
      userId,
      'Recall updated',
      `${patient.name} (${patient.reference}) — ${updated.status}`,
      updated.assignedEmployee,
    );

    return {
      id: String(updated.id),
      patientId: String(updated.patientId),
      clinicRecallNote: updated.clinicRecallNote,
      lastVisitDate: updated.lastVisitDate,
      suggestedContactDate: updated.suggestedContactDate,
      assignedEmployee: updated.assignedEmployee,
      status: updated.status as PatientRecall['status'],
    };
  } catch (error) {
    console.error('Failed to update recall:', error);
    throw new Error('Failed to update patient recall.', {cause: error});
  }
}

export async function updateSettingsRecord(
  userId: number,
  input: ClinicSettings,
  actor: string,
): Promise<ClinicSettings> {
  try {
    const [updated] = await db
      .insert(clinicSettings)
      .values({
        userId,
        clinicName: input.clinicName,
        country: input.country,
        currency: input.currency,
        timezone: input.timezone,
      })
      .onConflictDoUpdate({
        target: clinicSettings.userId,
        set: {
          clinicName: input.clinicName,
          country: input.country,
          currency: input.currency,
          timezone: input.timezone,
          updatedAt: new Date(),
        },
      })
      .returning();

    await logActivity(
      userId,
      'Clinic settings saved',
      `${updated.clinicName} · ${updated.currency} · ${updated.timezone}`,
      actor,
    );

    return {
      clinicName: updated.clinicName,
      country: updated.country,
      currency: updated.currency as ClinicSettings['currency'],
      timezone: updated.timezone,
    };
  } catch (error) {
    console.error('Failed to update clinic settings:', error);
    throw new Error('Failed to update clinic settings.', {cause: error});
  }
}
