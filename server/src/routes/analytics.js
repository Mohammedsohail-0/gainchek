const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { resolveClient } = require('../middleware/auth');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

router.use(authenticateToken, resolveClient);

/** GET /analytics/streak */
router.get('/streak', async (req, res, next) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { clientId: req.clientProfile.id },
      orderBy: { loggedAt: 'desc' },
      select: { loggedAt: true }
    });

    if (logs.length === 0) return res.json({ streak: 0, longestStreak: 0 });

    const uniqueDates = [...new Set(logs.map(l => {
      const d = new Date(l.loggedAt);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }))].sort().reverse();

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const logDate = new Date(uniqueDates[i]);
      const diffDays = Math.round((today - logDate) / 86400000);
      if (diffDays === i) currentStreak++;
      else break;
    }

    let longestStreak = 1, tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      if (Math.round((curr - prev) / 86400000) === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    res.json({ streak: currentStreak, longestStreak });
  } catch (err) {
    next(err);
  }
});

/** GET /analytics/calendar */
router.get('/calendar', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const logs = await prisma.workoutLog.findMany({
      where: { clientId: req.clientProfile.id, loggedAt: { gte: startOfMonth, lte: endOfMonth } }
    });

    const loggedDays = [...new Set(logs.map(l => new Date(l.loggedAt).getDate()))];
    res.json({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      daysInMonth: endOfMonth.getDate(),
      loggedDays
    });
  } catch (err) {
    next(err);
  }
});

/** GET /analytics/progression/:exerciseId */
router.get('/progression/:exerciseId', async (req, res, next) => {
  try {
    const logs = await prisma.exerciseLog.findMany({
      where: {
        exerciseId: req.params.exerciseId,
        workoutLog: { clientId: req.clientProfile.id }
      },
      include: { workoutLog: { select: { loggedAt: true } } },
      orderBy: { workoutLog: { loggedAt: 'asc' } }
    });

    const progression = logs.map(l => ({
      date: l.workoutLog.loggedAt,
      setNumber: l.setNumber,
      weightUsed: l.weightUsed,
      repsActual: l.repsActual,
    }));
    res.json(progression);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
