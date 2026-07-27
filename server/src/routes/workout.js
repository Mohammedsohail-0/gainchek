const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole, resolveCoach } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();

router.use(authenticateToken, requireRole('COACH'), resolveCoach);

// ─── Ownership helpers ────────────────────────────────────────────────────────

async function getOwnedPlan(planId, coachId) {
  const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan not found.');
  if (plan.coachId !== coachId) throw new ForbiddenError('Not authorized.');
  return plan;
}

async function getOwnedSplit(splitId, coachId) {
  const split = await prisma.workoutSplit.findUnique({
    where: { id: splitId },
    include: { workoutPlan: true }
  });
  if (!split) throw new NotFoundError('Split not found.');
  if (split.workoutPlan.coachId !== coachId) throw new ForbiddenError('Not authorized.');
  return split;
}

async function getOwnedExercise(exerciseId, coachId) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { workoutSplit: { include: { workoutPlan: true } } }
  });
  if (!exercise) throw new NotFoundError('Exercise not found.');
  if (exercise.workoutSplit.workoutPlan.coachId !== coachId) throw new ForbiddenError('Not authorized.');
  return exercise;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

/** POST /workout/plan */
router.post('/plan', async (req, res, next) => {
  try {
    const { clientId, title, description, isTemplate } = req.body;
    if (!title || !title.trim()) return next(new BadRequestError('title is required.'));

    if (clientId) {
      const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
      if (!client) return next(new NotFoundError('Client not found.'));
      if (client.coachId !== req.coach.id) return next(new ForbiddenError('Not your client.'));
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        coachId: req.coach.id,
        clientId: clientId || null,
        title: title.trim(),
        description: description || null,
        isTemplate: isTemplate || false,
      }
    });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/plan/templates */
router.get('/plan/templates', async (req, res, next) => {
  try {
    const templates = await prisma.workoutPlan.findMany({
      where: { coachId: req.coach.id, isTemplate: true },
      include: {
        workoutSplits: {
          where: { isArchived: false },
          include: { exercises: { where: { isArchived: false } } }
        },
        _count: { select: { clones: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/plan/:id/active-clones-count */
router.get('/plan/:id/active-clones-count', async (req, res, next) => {
  try {
    await getOwnedPlan(req.params.id, req.coach.id);
    const count = await prisma.workoutPlan.count({
      where: { clonedFromId: req.params.id, isActive: true }
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

/** GET /workout/plan/:id */
router.get('/plan/:id', async (req, res, next) => {
  try {
    await getOwnedPlan(req.params.id, req.coach.id);
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        workoutSplits: {
          where: { isArchived: false },
          orderBy: { day: 'asc' },
          include: {
            exercises: {
              where: { isArchived: false },
              orderBy: { order: 'asc' },
              include: { exerciseSets: { orderBy: { setNumber: 'asc' } } }
            }
          }
        }
      }
    });

    const shaped = {
      ...plan,
      workoutSplits: plan.workoutSplits.map(split => ({
        ...split,
        exercises: split.exercises.map(ex => ({
          ...ex,
          sets: ex.exerciseSets.map(s => ({ id: s.id, setNumber: s.setNumber, reps: s.reps, weight: s.weight }))
        }))
      }))
    };
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/plans/:clientId — all plans for a client */
router.get('/plans/:clientId', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { id: req.params.clientId } });
    if (!client) return next(new NotFoundError('Client not found.'));
    if (client.coachId !== req.coach.id) return next(new ForbiddenError('Not your client.'));

    const plans = await prisma.workoutPlan.findMany({
      where: { clientId: req.params.clientId, isTemplate: false },
      orderBy: { createdAt: 'desc' },
      include: {
        workoutSplits: {
          where: { isArchived: false },
          include: { exercises: { where: { isArchived: false } } }
        }
      }
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/activePlan/:clientId */
router.get('/activePlan/:clientId', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { id: req.params.clientId } });
    if (!client) return next(new NotFoundError('Client not found.'));
    if (client.coachId !== req.coach.id) return next(new ForbiddenError('Not your client.'));

    const plan = await prisma.workoutPlan.findFirst({
      where: { clientId: req.params.clientId, isActive: true },
      include: { workoutSplits: { include: { exercises: true } } }
    });
    if (!plan) return next(new NotFoundError('No active plan found for this client.'));
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

/** PUT /workout/plan/:id */
router.put('/plan/:id', async (req, res, next) => {
  try {
    await getOwnedPlan(req.params.id, req.coach.id);
    const { title, description, isActive } = req.body;
    const updated = await prisma.workoutPlan.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /workout/plan/:id */
router.delete('/plan/:id', async (req, res, next) => {
  try {
    await getOwnedPlan(req.params.id, req.coach.id);
    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Plan deleted.' });
  } catch (err) {
    next(err);
  }
});

// ─── Template: assign + push ──────────────────────────────────────────────────

/** POST /workout/plan/:templateId/assign */
router.post('/plan/:templateId/assign', async (req, res, next) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return next(new BadRequestError('clientId is required.'));

    const template = await prisma.workoutPlan.findUnique({
      where: { id: req.params.templateId },
      include: {
        workoutSplits: {
          include: { exercises: { include: { exerciseSets: true } } }
        }
      }
    });
    if (!template || template.coachId !== req.coach.id) return next(new NotFoundError('Template not found.'));

    const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
    if (!client || client.coachId !== req.coach.id) return next(new ForbiddenError('Not your client.'));

    // Deactivate existing active plans
    await prisma.workoutPlan.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false }
    });

    // Deep clone
    const clonedPlan = await prisma.workoutPlan.create({
      data: {
        coachId: req.coach.id,
        clientId,
        title: template.title,
        description: template.description,
        isTemplate: false,
        isActive: true,
        clonedFromId: template.id,
        workoutSplits: {
          create: template.workoutSplits.map(split => ({
            day: split.day,
            isRestDay: split.isRestDay,
            name: split.name,
            muscleGroups: split.muscleGroups,
            clonedFromId: split.id,
            exercises: {
              create: split.exercises.filter(ex => !ex.isArchived).map(ex => ({
                name: ex.name,
                muscleGroup: ex.muscleGroup,
                order: ex.order,
                notes: ex.notes,
                clonedFromId: ex.id,
                exerciseSets: {
                  create: ex.exerciseSets.map(s => ({
                    setNumber: s.setNumber, reps: s.reps, weight: s.weight
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        workoutSplits: {
          include: { exercises: { include: { exerciseSets: true } } }
        }
      }
    });
    res.status(201).json(clonedPlan);
  } catch (err) {
    next(err);
  }
});

/** POST /workout/plan/:templateId/push */
router.post('/plan/:templateId/push', async (req, res, next) => {
  try {
    const template = await prisma.workoutPlan.findUnique({
      where: { id: req.params.templateId },
      include: {
        workoutSplits: {
          where: { isArchived: false },
          include: { exercises: { where: { isArchived: false }, include: { exerciseSets: true } } }
        }
      }
    });
    if (!template || template.coachId !== req.coach.id) return next(new NotFoundError('Template not found.'));

    const clones = await prisma.workoutPlan.findMany({
      where: { clonedFromId: template.id, isActive: true },
      include: {
        client: { select: { name: true } },
        workoutSplits: {
          include: {
            workoutLogs: { select: { id: true } },
            exercises: { include: { exerciseSets: true, exerciseLogs: { select: { id: true } } } }
          }
        }
      }
    });

    const results = { updated: 0, total: clones.length, failed: [] };

    for (const clientPlan of clones) {
      try {
        await pushTemplateToClientPlan(template, clientPlan);
        results.updated += 1;
      } catch (err) {
        console.error(`Push failed for plan ${clientPlan.id}:`, err);
        results.failed.push({
          clientName: clientPlan.client?.name || 'Unknown',
          reason: 'Could not update this client\'s plan. Please check it manually.',
        });
      }
    }
    res.json(results);
  } catch (err) {
    next(err);
  }
});

async function pushTemplateToClientPlan(template, clientPlan) {
  await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.update({
      where: { id: clientPlan.id },
      data: { title: template.title, description: template.description }
    });

    const templateSplitIds = new Set(template.workoutSplits.map(s => s.id));

    for (const clientSplit of clientPlan.workoutSplits) {
      if (clientSplit.isArchived) continue;
      if (!clientSplit.clonedFromId || templateSplitIds.has(clientSplit.clonedFromId)) continue;
      const hasLogs = clientSplit.workoutLogs?.length > 0 || clientSplit.exercises.some(e => e.exerciseLogs?.length > 0);
      if (hasLogs) {
        await tx.workoutSplit.update({ where: { id: clientSplit.id }, data: { isArchived: true } });
      } else {
        await tx.workoutSplit.delete({ where: { id: clientSplit.id } });
      }
    }

    for (const templateSplit of template.workoutSplits) {
      const clientSplit = clientPlan.workoutSplits.find(s => s.clonedFromId === templateSplit.id && !s.isArchived);

      if (!clientSplit) {
        await tx.workoutSplit.create({
          data: {
            workoutPlanId: clientPlan.id,
            day: templateSplit.day, isRestDay: templateSplit.isRestDay,
            name: templateSplit.name, muscleGroups: templateSplit.muscleGroups,
            clonedFromId: templateSplit.id,
            exercises: {
              create: templateSplit.exercises.map(ex => ({
                name: ex.name, muscleGroup: ex.muscleGroup, order: ex.order, notes: ex.notes,
                clonedFromId: ex.id,
                exerciseSets: { create: ex.exerciseSets.map(s => ({ setNumber: s.setNumber, reps: s.reps, weight: s.weight })) }
              }))
            }
          }
        });
        continue;
      }

      await tx.workoutSplit.update({
        where: { id: clientSplit.id },
        data: { day: templateSplit.day, isRestDay: templateSplit.isRestDay, name: templateSplit.name, muscleGroups: templateSplit.muscleGroups }
      });

      const templateExerciseIds = new Set(templateSplit.exercises.map(e => e.id));
      for (const clientEx of clientSplit.exercises) {
        if (clientEx.isArchived) continue;
        if (!clientEx.clonedFromId || templateExerciseIds.has(clientEx.clonedFromId)) continue;
        if (clientEx.exerciseLogs?.length > 0) {
          await tx.exercise.update({ where: { id: clientEx.id }, data: { isArchived: true } });
        } else {
          await tx.exercise.delete({ where: { id: clientEx.id } });
        }
      }

      for (const templateEx of templateSplit.exercises) {
        const clientEx = clientSplit.exercises.find(e => e.clonedFromId === templateEx.id && !e.isArchived);
        if (!clientEx) {
          await tx.exercise.create({
            data: {
              workoutSplitId: clientSplit.id,
              name: templateEx.name, muscleGroup: templateEx.muscleGroup, order: templateEx.order, notes: templateEx.notes,
              clonedFromId: templateEx.id,
              exerciseSets: { create: templateEx.exerciseSets.map(s => ({ setNumber: s.setNumber, reps: s.reps, weight: s.weight })) }
            }
          });
          continue;
        }
        await tx.exercise.update({
          where: { id: clientEx.id },
          data: { name: templateEx.name, muscleGroup: templateEx.muscleGroup, order: templateEx.order, notes: templateEx.notes }
        });
        await tx.exerciseSet.deleteMany({ where: { exerciseId: clientEx.id } });
        await tx.exerciseSet.createMany({
          data: templateEx.exerciseSets.map(s => ({ exerciseId: clientEx.id, setNumber: s.setNumber, reps: s.reps, weight: s.weight }))
        });
      }
    }
  });
}

// ─── Splits ───────────────────────────────────────────────────────────────────

/** POST /workout/split */
router.post('/split', async (req, res, next) => {
  try {
    const { planId, day, isRestDay, name, muscleGroups } = req.body;
    await getOwnedPlan(planId, req.coach.id);

    const existingSplits = await prisma.workoutSplit.findMany({ where: { workoutPlanId: planId } });
    if (existingSplits.length >= 7) return next(new BadRequestError('Plan already has 7 days.'));
    if (existingSplits.some(s => s.day === day)) return next(new BadRequestError(`${day} is already assigned for this plan.`));

    const split = await prisma.workoutSplit.create({
      data: { workoutPlanId: planId, day, isRestDay: isRestDay || false, name: name || null, muscleGroups: muscleGroups || null }
    });
    res.status(201).json(split);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/split/:planId */
router.get('/split/:planId', async (req, res, next) => {
  try {
    await getOwnedPlan(req.params.planId, req.coach.id);
    const splits = await prisma.workoutSplit.findMany({
      where: { workoutPlanId: req.params.planId, isArchived: false },
      include: {
        exercises: {
          where: { isArchived: false },
          orderBy: { order: 'asc' },
          include: { exerciseSets: { orderBy: { setNumber: 'asc' } } }
        }
      }
    });
    const shaped = splits.map(s => ({
      ...s,
      exercises: s.exercises.map(ex => ({
        ...ex,
        sets: ex.exerciseSets.map(st => ({ id: st.id, setNumber: st.setNumber, reps: st.reps, weight: st.weight }))
      }))
    }));
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

/** GET /workout/split/one/:id */
router.get('/split/one/:id', async (req, res, next) => {
  try {
    const split = await prisma.workoutSplit.findUnique({
      where: { id: req.params.id },
      include: {
        workoutPlan: true,
        exercises: {
          where: { isArchived: false },
          orderBy: { order: 'asc' },
          include: { exerciseSets: { orderBy: { setNumber: 'asc' } } }
        }
      }
    });
    if (!split) return next(new NotFoundError('Split not found.'));
    if (split.workoutPlan.coachId !== req.coach.id) return next(new ForbiddenError('Not authorized.'));

    const shaped = {
      ...split,
      exercises: split.exercises.map(ex => ({
        ...ex,
        sets: ex.exerciseSets.map(s => ({ id: s.id, setNumber: s.setNumber, reps: s.reps, weight: s.weight }))
      }))
    };
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

/** PUT /workout/split/:id */
router.put('/split/:id', async (req, res, next) => {
  try {
    await getOwnedSplit(req.params.id, req.coach.id);
    const { day, isRestDay, name, muscleGroups } = req.body;
    const updated = await prisma.workoutSplit.update({
      where: { id: req.params.id },
      data: { day, isRestDay, name, muscleGroups }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /workout/split/:id */
router.delete('/split/:id', async (req, res, next) => {
  try {
    await getOwnedSplit(req.params.id, req.coach.id);

    const split = await prisma.workoutSplit.findUnique({
      where: { id: req.params.id },
      include: {
        workoutLogs: { select: { id: true } },
        exercises: { include: { exerciseLogs: { select: { id: true } } } }
      }
    });

    const hasLogs = split.workoutLogs.length > 0 || split.exercises.some(e => e.exerciseLogs.length > 0);
    if (hasLogs) {
      const archived = await prisma.workoutSplit.update({ where: { id: req.params.id }, data: { isArchived: true } });
      return res.json({ message: 'Day has logged history — archived instead of deleted.', split: archived });
    }
    await prisma.workoutSplit.delete({ where: { id: req.params.id } });
    res.json({ message: 'Split deleted.' });
  } catch (err) {
    next(err);
  }
});

// ─── Exercises (bulk save — key v1 pattern) ───────────────────────────────────

/** POST /workout/split/:splitId/exercises */
router.post('/split/:splitId/exercises', async (req, res, next) => {
  try {
    const { exercises } = req.body;
    if (!Array.isArray(exercises)) return next(new BadRequestError('exercises must be an array.'));
    const invalid = exercises.find(e => !e.name || !e.name.trim());
    if (invalid) return next(new BadRequestError('Every exercise needs a name.'));

    await getOwnedSplit(req.params.splitId, req.coach.id);

    const split = await prisma.workoutSplit.findUnique({
      where: { id: req.params.splitId },
      include: { exercises: { where: { isArchived: false }, include: { exerciseLogs: { select: { id: true } } } } }
    });

    const saved = await prisma.$transaction(async (tx) => {
      const incomingIds = new Set(exercises.filter(e => e.id).map(e => e.id));

      for (const existing of split.exercises) {
        if (incomingIds.has(existing.id)) continue;
        if (existing.exerciseLogs.length > 0) {
          await tx.exercise.update({ where: { id: existing.id }, data: { isArchived: true } });
        } else {
          await tx.exercise.delete({ where: { id: existing.id } });
        }
      }

      const result = [];
      for (const ex of exercises) {
        const setData = (ex.sets || []).map((s, i) => ({
          setNumber: s.setNumber ?? i + 1,
          reps: parseInt(s.reps, 10) || 0,
          weight: s.weight !== '' && s.weight != null ? parseFloat(s.weight) : null,
        }));

        if (ex.id && split.exercises.some(e => e.id === ex.id)) {
          await tx.exercise.update({
            where: { id: ex.id },
            data: { name: ex.name.trim(), muscleGroup: ex.muscleGroup, order: ex.order ?? 0, notes: ex.notes || null }
          });
          await tx.exerciseSet.deleteMany({ where: { exerciseId: ex.id } });
          await tx.exerciseSet.createMany({ data: setData.map(s => ({ ...s, exerciseId: ex.id })) });
          const full = await tx.exercise.findUnique({ where: { id: ex.id }, include: { exerciseSets: true } });
          result.push(full);
        } else {
          const created = await tx.exercise.create({
            data: {
              workoutSplitId: req.params.splitId,
              name: ex.name.trim(),
              muscleGroup: ex.muscleGroup,
              order: ex.order ?? 0,
              notes: ex.notes || null,
              exerciseSets: { create: setData }
            },
            include: { exerciseSets: true }
          });
          result.push(created);
        }
      }
      return result;
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

/** POST /workout/exercise */
router.post('/exercise', async (req, res, next) => {
  try {
    const { splitId, name, muscleGroup, order, notes, sets } = req.body;
    await getOwnedSplit(splitId, req.coach.id);

    const exercise = await prisma.exercise.create({
      data: {
        workoutSplitId: splitId, name: name.trim(), muscleGroup, order: order ?? 0, notes: notes || null,
        ...(Array.isArray(sets) && sets.length > 0 && {
          exerciseSets: {
            create: sets.map((s, i) => ({
              setNumber: s.setNumber ?? i + 1,
              reps: parseInt(s.reps, 10) || 0,
              weight: s.weight !== '' && s.weight != null ? parseFloat(s.weight) : null,
            }))
          }
        })
      },
      include: { exerciseSets: true }
    });
    res.status(201).json(exercise);
  } catch (err) {
    next(err);
  }
});

/** PUT /workout/exercise/:id */
router.put('/exercise/:id', async (req, res, next) => {
  try {
    await getOwnedExercise(req.params.id, req.coach.id);
    const { name, muscleGroup, order, notes } = req.body;
    const updated = await prisma.exercise.update({
      where: { id: req.params.id },
      data: { name, muscleGroup, order, notes },
      include: { exerciseSets: true }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /workout/exercise/:id */
router.delete('/exercise/:id', async (req, res, next) => {
  try {
    await getOwnedExercise(req.params.id, req.coach.id);
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
      include: { exerciseLogs: { select: { id: true } } }
    });
    if (exercise.exerciseLogs.length > 0) {
      const archived = await prisma.exercise.update({ where: { id: req.params.id }, data: { isArchived: true } });
      return res.json({ message: 'Exercise has logged history — archived instead of deleted.', exercise: archived });
    }
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.json({ message: 'Exercise deleted.' });
  } catch (err) {
    next(err);
  }
});

/** GET /workout/exercise/:splitId */
router.get('/exercise/:splitId', async (req, res, next) => {
  try {
    await getOwnedSplit(req.params.splitId, req.coach.id);
    const exercises = await prisma.exercise.findMany({
      where: { workoutSplitId: req.params.splitId, isArchived: false },
      orderBy: { order: 'asc' },
      include: { exerciseSets: { orderBy: { setNumber: 'asc' } } }
    });
    res.json(exercises);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
