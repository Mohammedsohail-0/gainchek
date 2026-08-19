const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();

router.use(authenticateToken);

/** POST /log/workout */
router.post('/workout', async (req, res, next) => {
  try {
    const { planId, splitId, note, exercises } = req.body;
    if (!planId || !splitId || !Array.isArray(exercises)) {
      return next(new BadRequestError('planId, splitId, and exercises[] are required.'));
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const split = await prisma.workoutSplit.findUnique({ where: { id: splitId } });
    if (!split) return next(new NotFoundError('Workout split not found.'));

    const todayDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    if (split.day && split.day.toLowerCase() !== todayDayName) {
      const todayCap = todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1);
      return next(new BadRequestError(`You can only log today's scheduled workout (${todayCap}).`));
    }

    const log = await prisma.workoutLog.create({
      data: {
        clientId: client.id,
        planId,
        splitId,
        note: note || null,
        exerciseLogs: {
          create: exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            setNumber: ex.setNumber,
            weightUsed: ex.weightUsed ?? null,
            repsActual: ex.repsActual ?? null,
          }))
        }
      },
      include: { exerciseLogs: true }
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

/** GET /log/history — client's own history */
router.get('/history', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.workoutLog.findMany({
        where: { clientId: client.id },
        orderBy: { loggedAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          split: { select: { name: true, day: true } },
          exerciseLogs: {
            include: { exercise: { select: { name: true, muscleGroup: true } } }
          }
        }
      }),
      prisma.workoutLog.count({ where: { clientId: client.id } })
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
});

/** GET /log/history/:clientId — coach views a client's history */
router.get('/history/:clientId', async (req, res, next) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.user.userId } });
    if (!coach) return next(new NotFoundError('Coach not found.'));

    const client = await prisma.clientProfile.findUnique({ where: { id: req.params.clientId } });
    if (!client) return next(new NotFoundError('Client not found.'));
    if (client.coachId !== coach.id) return next(new ForbiddenError('Not authorized.'));

    const logs = await prisma.workoutLog.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { loggedAt: 'desc' },
      include: {
        split: { select: { name: true, day: true } },
        exerciseLogs: {
          include: { exercise: { select: { name: true, muscleGroup: true } } }
        }
      }
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
