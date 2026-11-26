import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {getOrCreateUser} from './src/db/users.ts';
import {
  createFollowUpRecord,
  createPatientRecord,
  createRecallRecord,
  createTreatmentRecord,
  getWorkspaceForUser,
  resetWorkspaceForUser,
  updateFollowUpRecord,
  updatePatientRecord,
  updateRecallRecord,
  updateSettingsRecord,
  updateTreatmentRecord,
} from './src/db/workspace.ts';
import {requireAuth, type AuthRequest} from './src/middleware/auth.ts';
import {getTodayIso} from './src/utils/dateUtils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

async function resolveDbUser(req: AuthRequest) {
  const uid = req.user?.uid;
  if (!uid) {
    throw new Error('Authenticated user identifier is missing.');
  }
  const email = req.user?.email ?? `${uid}@dental-loop.local`;
  const actor = req.user?.name || req.user?.email || 'Clinic Staff';
  const dbUser = await getOrCreateUser(uid, email);
  return {dbUser, actor};
}

function parsePositiveInt(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser} = await resolveDbUser(req);
      const workspace = await getWorkspaceForUser(dbUser.id);
      res.json(workspace);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load workspace.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/workspace/reset', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser} = await resolveDbUser(req);
      const workspace = await resetWorkspaceForUser(dbUser.id);
      res.json(workspace);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to reset workspace.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/patients', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser, actor} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.name !== 'string' ||
        body.name.trim().length < 2 ||
        typeof body.reference !== 'string' ||
        !body.reference.trim() ||
        typeof body.phone !== 'string' ||
        !body.phone.trim() ||
        typeof body.email !== 'string' ||
        !body.email.trim() ||
        typeof body.assignedDentist !== 'string' ||
        !body.assignedDentist.trim() ||
        typeof body.registrationDate !== 'string' ||
        !body.registrationDate.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid patient payload.'});
      }

      const created = await createPatientRecord(
        dbUser.id,
        {
          name: body.name.trim(),
          reference: body.reference.trim().toUpperCase(),
          phone: body.phone.trim(),
          email: body.email.trim(),
          assignedDentist: body.assignedDentist.trim(),
          registrationDate: body.registrationDate.trim(),
          status: body.status,
          notes: typeof body.notes === 'string' ? body.notes.trim() : '',
        },
        actor,
      );
      res.status(201).json(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create patient.';
      res.status(500).json({error: message});
    }
  });

  app.put('/api/patients/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const patientId = parsePositiveInt(req.params.id);
      if (!patientId) {
        return res.status(400).json({error: 'Invalid patient identifier.'});
      }
      const {dbUser, actor} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.name !== 'string' ||
        body.name.trim().length < 2 ||
        typeof body.reference !== 'string' ||
        !body.reference.trim() ||
        typeof body.phone !== 'string' ||
        !body.phone.trim() ||
        typeof body.email !== 'string' ||
        !body.email.trim() ||
        typeof body.assignedDentist !== 'string' ||
        !body.assignedDentist.trim() ||
        typeof body.registrationDate !== 'string' ||
        !body.registrationDate.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid patient payload.'});
      }

      const updated = await updatePatientRecord(
        dbUser.id,
        patientId,
        {
          name: body.name.trim(),
          reference: body.reference.trim().toUpperCase(),
          phone: body.phone.trim(),
          email: body.email.trim(),
          assignedDentist: body.assignedDentist.trim(),
          registrationDate: body.registrationDate.trim(),
          status: body.status,
          notes: typeof body.notes === 'string' ? body.notes.trim() : '',
        },
        actor,
      );
      if (!updated) {
        return res.status(404).json({error: 'Patient record not found.'});
      }
      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update patient.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/follow-ups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.category !== 'string' ||
        typeof body.description !== 'string' ||
        body.description.trim().length < 4 ||
        typeof body.dueDate !== 'string' ||
        !body.dueDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.priority !== 'string' ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid follow-up payload.'});
      }

      const createdAt =
        typeof body.createdAt === 'string' && body.createdAt.trim()
          ? body.createdAt.trim()
          : getTodayIso();

      const created = await createFollowUpRecord(
        dbUser.id,
        {
          patientId: body.patientId.trim(),
          category: body.category,
          description: body.description.trim(),
          dueDate: body.dueDate.trim(),
          assignedEmployee: body.assignedEmployee.trim(),
          priority: body.priority,
          status: body.status,
        },
        createdAt,
      );
      if (!created) {
        return res.status(404).json({error: 'Referenced patient not found.'});
      }
      res.status(201).json(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create follow-up.';
      res.status(500).json({error: message});
    }
  });

  app.put('/api/follow-ups/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const followUpId = parsePositiveInt(req.params.id);
      if (!followUpId) {
        return res.status(400).json({error: 'Invalid follow-up identifier.'});
      }
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.category !== 'string' ||
        typeof body.description !== 'string' ||
        body.description.trim().length < 4 ||
        typeof body.dueDate !== 'string' ||
        !body.dueDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.priority !== 'string' ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid follow-up payload.'});
      }

      const updated = await updateFollowUpRecord(dbUser.id, followUpId, {
        patientId: body.patientId.trim(),
        category: body.category,
        description: body.description.trim(),
        dueDate: body.dueDate.trim(),
        assignedEmployee: body.assignedEmployee.trim(),
        priority: body.priority,
        status: body.status,
        createdAt:
          typeof body.createdAt === 'string' ? body.createdAt : getTodayIso(),
      });
      if (!updated) {
        return res.status(404).json({error: 'Follow-up record not found.'});
      }
      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update follow-up.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/treatments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.treatmentReference !== 'string' ||
        !body.treatmentReference.trim() ||
        typeof body.treatmentSummary !== 'string' ||
        !body.treatmentSummary.trim() ||
        typeof body.dateRecommended !== 'string' ||
        !body.dateRecommended.trim() ||
        typeof body.followUpDate !== 'string' ||
        !body.followUpDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid treatment payload.'});
      }

      const estimatedValue =
        body.estimatedValue !== undefined &&
        body.estimatedValue !== null &&
        Number.isFinite(Number(body.estimatedValue))
          ? Math.max(0, Math.round(Number(body.estimatedValue)))
          : undefined;

      const created = await createTreatmentRecord(dbUser.id, {
        patientId: body.patientId.trim(),
        treatmentReference: body.treatmentReference.trim().toUpperCase(),
        treatmentSummary: body.treatmentSummary.trim(),
        dateRecommended: body.dateRecommended.trim(),
        followUpDate: body.followUpDate.trim(),
        assignedEmployee: body.assignedEmployee.trim(),
        estimatedValue,
        status: body.status,
      });
      if (!created) {
        return res.status(404).json({error: 'Referenced patient not found.'});
      }
      res.status(201).json(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create treatment.';
      res.status(500).json({error: message});
    }
  });

  app.put('/api/treatments/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const treatmentId = parsePositiveInt(req.params.id);
      if (!treatmentId) {
        return res.status(400).json({error: 'Invalid treatment identifier.'});
      }
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.treatmentReference !== 'string' ||
        !body.treatmentReference.trim() ||
        typeof body.treatmentSummary !== 'string' ||
        !body.treatmentSummary.trim() ||
        typeof body.dateRecommended !== 'string' ||
        !body.dateRecommended.trim() ||
        typeof body.followUpDate !== 'string' ||
        !body.followUpDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid treatment payload.'});
      }

      const estimatedValue =
        body.estimatedValue !== undefined &&
        body.estimatedValue !== null &&
        Number.isFinite(Number(body.estimatedValue))
          ? Math.max(0, Math.round(Number(body.estimatedValue)))
          : undefined;

      const updated = await updateTreatmentRecord(dbUser.id, treatmentId, {
        patientId: body.patientId.trim(),
        treatmentReference: body.treatmentReference.trim().toUpperCase(),
        treatmentSummary: body.treatmentSummary.trim(),
        dateRecommended: body.dateRecommended.trim(),
        followUpDate: body.followUpDate.trim(),
        assignedEmployee: body.assignedEmployee.trim(),
        estimatedValue,
        status: body.status,
      });
      if (!updated) {
        return res.status(404).json({error: 'Treatment item not found.'});
      }
      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update treatment.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/recalls', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.clinicRecallNote !== 'string' ||
        !body.clinicRecallNote.trim() ||
        typeof body.lastVisitDate !== 'string' ||
        !body.lastVisitDate.trim() ||
        typeof body.suggestedContactDate !== 'string' ||
        !body.suggestedContactDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid recall payload.'});
      }

      const created = await createRecallRecord(dbUser.id, {
        patientId: body.patientId.trim(),
        clinicRecallNote: body.clinicRecallNote.trim(),
        lastVisitDate: body.lastVisitDate.trim(),
        suggestedContactDate: body.suggestedContactDate.trim(),
        assignedEmployee: body.assignedEmployee.trim(),
        status: body.status,
      });
      if (!created) {
        return res.status(404).json({error: 'Referenced patient not found.'});
      }
      res.status(201).json(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to schedule recall.';
      res.status(500).json({error: message});
    }
  });

  app.put('/api/recalls/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const recallId = parsePositiveInt(req.params.id);
      if (!recallId) {
        return res.status(400).json({error: 'Invalid recall identifier.'});
      }
      const {dbUser} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.patientId !== 'string' ||
        !body.patientId.trim() ||
        typeof body.clinicRecallNote !== 'string' ||
        !body.clinicRecallNote.trim() ||
        typeof body.lastVisitDate !== 'string' ||
        !body.lastVisitDate.trim() ||
        typeof body.suggestedContactDate !== 'string' ||
        !body.suggestedContactDate.trim() ||
        typeof body.assignedEmployee !== 'string' ||
        !body.assignedEmployee.trim() ||
        typeof body.status !== 'string'
      ) {
        return res.status(400).json({error: 'Invalid recall payload.'});
      }

      const updated = await updateRecallRecord(dbUser.id, recallId, {
        patientId: body.patientId.trim(),
        clinicRecallNote: body.clinicRecallNote.trim(),
        lastVisitDate: body.lastVisitDate.trim(),
        suggestedContactDate: body.suggestedContactDate.trim(),
        assignedEmployee: body.assignedEmployee.trim(),
        status: body.status,
      });
      if (!updated) {
        return res.status(404).json({error: 'Patient recall record not found.'});
      }
      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update recall.';
      res.status(500).json({error: message});
    }
  });

  app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {dbUser, actor} = await resolveDbUser(req);
      const body = req.body ?? {};
      if (
        typeof body.clinicName !== 'string' ||
        body.clinicName.trim().length < 2 ||
        typeof body.country !== 'string' ||
        !body.country.trim() ||
        typeof body.currency !== 'string' ||
        typeof body.timezone !== 'string' ||
        !body.timezone.trim()
      ) {
        return res.status(400).json({error: 'Invalid clinic settings payload.'});
      }

      const updated = await updateSettingsRecord(
        dbUser.id,
        {
          clinicName: body.clinicName.trim(),
          country: body.country.trim(),
          currency: body.currency,
          timezone: body.timezone.trim(),
        },
        actor,
      );
      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save clinic settings.';
      res.status(500).json({error: message});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dental Loop server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Dental Loop server:', error);
  process.exit(1);
});
