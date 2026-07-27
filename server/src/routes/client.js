const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();
const VALID_GOALS = ['BUILD_MUSCLE', 'LOSE_FAT', 'GET_STRONGER', 'GENERAL_FITNESS'];

router.use(authenticateToken, requireRole('CLIENT'));

// ─── Profile ──────────────────────────────────────────────────────────────────

/** GET /client/profile */
router.get('/profile', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { email: true, name: true } },
        coach: { include: { user: { select: { name: true, email: true } } } }
      }
    });
    if (!client) return next(new NotFoundError('Client profile not found.'));
    res.json(client);
  } catch (err) {
    next(err);
  }
});

/** PUT /client/profile (used for onboarding and updates) */
router.put('/profile', async (req, res, next) => {
  try {
    const { name, goal, age, gender, bodyWeight } = req.body;

    if (goal !== undefined && goal !== null && !VALID_GOALS.includes(goal)) {
      return next(new BadRequestError(`goal must be one of: ${VALID_GOALS.join(', ')}`));
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const updated = await prisma.clientProfile.update({
      where: { id: client.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(goal !== undefined && { goal }),
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(bodyWeight !== undefined && { bodyWeight }),
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── Active Plan ──────────────────────────────────────────────────────────────

/** GET /client/plan */
router.get('/plan', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const plan = await prisma.workoutPlan.findFirst({
      where: { clientId: client.id, isActive: true },
      include: {
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
    if (!plan) return next(new NotFoundError('No active plan found. Check back once your coach sets one up.'));

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

// ─── Body Weight ──────────────────────────────────────────────────────────────

/** POST /client/bodyweight */
router.post('/bodyweight', async (req, res, next) => {
  try {
    const { weight } = req.body;
    if (weight === undefined || weight === null || isNaN(weight)) {
      return next(new BadRequestError('weight is required and must be a number.'));
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const roundedWeight = Math.round(Number(weight));

    const [log] = await prisma.$transaction([
      prisma.bodyWeightLog.create({ data: { clientId: client.id, weight: roundedWeight } }),
      prisma.clientProfile.update({ where: { id: client.id }, data: { bodyWeight: roundedWeight } })
    ]);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

/** GET /client/bodyweight */
router.get('/bodyweight', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const logs = await prisma.bodyWeightLog.findMany({
      where: { clientId: client.id },
      orderBy: { loggedAt: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ─── Announcements (client reads gym announcements) ───────────────────────────

/** GET /client/announcements */
router.get('/announcements', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: req.user.userId },
      include: { coach: true }
    });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    // Only show if coach belongs to a gym
    if (!client.coach?.gymId) return res.json([]);

    const announcements = await prisma.announcement.findMany({
      where: { gymId: client.coach.gymId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
