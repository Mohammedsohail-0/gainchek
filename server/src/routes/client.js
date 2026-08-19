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
        coach: {
          include: {
            user: { select: { name: true, email: true } },
            gym: { select: { id: true, name: true } }
          }
        },
        memberships: {
          include: { gym: { select: { id: true, name: true } } }
        }
      }
    });
    if (!client) return next(new NotFoundError('Client profile not found.'));
    res.json(client);
  } catch (err) {
    next(err);
  }
});

function calculateAge(dobInput) {
  if (!dobInput) return null;
  const birthDate = new Date(dobInput);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/** PUT /client/profile (used for onboarding and updates) */
router.put('/profile', async (req, res, next) => {
  try {
    const { name, goal, dob, age: bodyAge, gender, bodyWeight } = req.body;

    if (goal !== undefined && goal !== null && !VALID_GOALS.includes(goal)) {
      return next(new BadRequestError(`goal must be one of: ${VALID_GOALS.join(', ')}`));
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    let computedAge = undefined;
    let parsedDob = undefined;

    if (dob !== undefined && dob !== null && dob !== '') {
      parsedDob = new Date(dob);
      computedAge = calculateAge(dob);
    } else if (bodyAge !== undefined) {
      computedAge = bodyAge;
    }

    const updated = await prisma.clientProfile.update({
      where: { id: client.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(goal !== undefined && { goal }),
        ...(parsedDob !== undefined && { dob: parsedDob }),
        ...(computedAge !== undefined && { age: computedAge }),
        ...(gender !== undefined && { gender }),
        ...(bodyWeight !== undefined && { bodyWeight }),
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /client/redeem-invite
 * Body: { inviteCode }
 * Redeem a COACH_TO_CLIENT or GYM_TO_CLIENT invite code.
 */
router.post('/redeem-invite', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || typeof inviteCode !== 'string') {
      return next(new BadRequestError('Invite code is required.'));
    }

    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode: inviteCode.trim() }
    });

    if (!invitation) {
      return next(new BadRequestError('Invalid or expired invite code.'));
    }

    if (invitation.used) {
      return next(new BadRequestError('This invite link has already been used.'));
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    if (invitation.type === 'COACH_TO_CLIENT' && invitation.coachId) {
      if (client.coachId) {
        return next(new BadRequestError('You are already assigned to a personal trainer. Please leave your current trainer before joining a new one.'));
      }
      await prisma.clientProfile.update({
        where: { id: client.id },
        data: { coachId: invitation.coachId, isActive: true }
      });
      await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
    } else if (invitation.type === 'GYM_TO_CLIENT' && invitation.gymId) {
      const activeMembership = await prisma.gymMembership.findFirst({
        where: { clientId: client.id, isActive: true }
      });
      if (activeMembership && activeMembership.gymId !== invitation.gymId) {
        return next(new BadRequestError('You are already a member of a gym facility. Please leave your current gym before joining a new one.'));
      }
      await prisma.gymMembership.upsert({
        where: { clientId_gymId: { clientId: client.id, gymId: invitation.gymId } },
        create: { clientId: client.id, gymId: invitation.gymId, type: 'GENERAL', isActive: true },
        update: { isActive: true }
      });
      await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
    } else {
      return next(new BadRequestError('Invite code type not supported for client accounts.'));
    }

    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: client.id },
      include: {
        user: { select: { email: true, name: true } },
        coach: {
          include: {
            user: { select: { name: true, email: true } },
            gym: { select: { id: true, name: true } }
          }
        },
        memberships: {
          include: { gym: { select: { id: true, name: true } } }
        }
      }
    });

    res.json({ message: 'Invite redeemed successfully!', profile: updatedProfile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /client/leave-coach
 * Unassign client from personal trainer (sets coachId to null).
 */
router.post('/leave-coach', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    await prisma.clientProfile.update({
      where: { id: client.id },
      data: { coachId: null }
    });

    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: client.id },
      include: {
        user: { select: { email: true, name: true } },
        coach: {
          include: {
            user: { select: { name: true, email: true } },
            gym: { select: { id: true, name: true } }
          }
        },
        memberships: {
          include: { gym: { select: { id: true, name: true } } }
        }
      }
    });

    res.json({ message: 'Successfully left personal trainer.', profile: updatedProfile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /client/leave-gym
 * Deactivate gym membership for the client.
 */
router.post('/leave-gym', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.userId } });
    if (!client) return next(new NotFoundError('Client profile not found.'));

    await prisma.gymMembership.updateMany({
      where: { clientId: client.id },
      data: { isActive: false }
    });

    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: client.id },
      include: {
        user: { select: { email: true, name: true } },
        coach: {
          include: {
            user: { select: { name: true, email: true } },
            gym: { select: { id: true, name: true } }
          }
        },
        memberships: {
          include: { gym: { select: { id: true, name: true } } }
        }
      }
    });

    res.json({ message: 'Successfully left gym facility.', profile: updatedProfile });
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
