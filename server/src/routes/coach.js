const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole, resolveCoach } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();

router.use(authenticateToken, requireRole('COACH'), resolveCoach);

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * GET /coach/profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const coach = await prisma.coachProfile.findUnique({
      where: { id: req.coach.id },
      include: {
        user: { select: { name: true, email: true } },
        gym: { select: { id: true, name: true } }
      }
    });
    res.json(coach);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /coach/profile
 * Update coach display name.
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (name !== undefined && name !== null) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { name: name.trim() }
      });
    }
    const coach = await prisma.coachProfile.findUnique({
      where: { id: req.coach.id },
      include: {
        user: { select: { name: true, email: true } },
        gym: { select: { id: true, name: true } }
      }
    });
    res.json(coach);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /coach/join-gym
 * Redeem a GYM_TO_COACH invite code to link with a gym.
 */
router.post('/join-gym', async (req, res, next) => {
  try {
    if (req.coach.gymId) {
      return next(new BadRequestError('You are already affiliated with a gym. Please leave your current gym before joining a new one.'));
    }

    const { inviteCode } = req.body;
    if (!inviteCode || typeof inviteCode !== 'string') {
      return next(new BadRequestError('Invite code is required.'));
    }

    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode: inviteCode.trim() }
    });

    if (!invitation || invitation.type !== 'GYM_TO_COACH' || !invitation.gymId) {
      return next(new BadRequestError('Invalid or expired gym invite code.'));
    }

    const updatedCoach = await prisma.coachProfile.update({
      where: { id: req.coach.id },
      data: { gymId: invitation.gymId },
      include: {
        user: { select: { name: true, email: true } },
        gym: { select: { id: true, name: true } }
      }
    });

    res.json(updatedCoach);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /coach/leave-gym
 * Unassign coach from current gym facility (sets gymId to null).
 */
router.post('/leave-gym', async (req, res, next) => {
  try {
    const updatedCoach = await prisma.coachProfile.update({
      where: { id: req.coach.id },
      data: { gymId: null },
      include: {
        user: { select: { name: true, email: true } },
        gym: { select: { id: true, name: true } }
      }
    });

    res.json({ message: 'Successfully left gym facility.', coach: updatedCoach });
  } catch (err) {
    next(err);
  }
});

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * GET /coach/clients
 * All active clients for this coach, with 7-day workout activity.
 */
router.get('/clients', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const clients = await prisma.clientProfile.findMany({
      where: { coachId: req.coach.id, isActive: true },
      include: {
        user: { select: { email: true } },
        workoutLogs: {
          where: { loggedAt: { gte: sevenDaysAgo } },
          select: { loggedAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /coach/clients/:id
 */
router.get('/clients/:id', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findFirst({
      where: { id: req.params.id, coachId: req.coach.id },
      include: {
        user: { select: { email: true } },
        workoutPlans: {
          where: { isTemplate: false },
          orderBy: { createdAt: 'desc' }
        },
        bodyWeightLogs: { orderBy: { loggedAt: 'desc' }, take: 30 }
      }
    });
    if (!client) return next(new NotFoundError('Client not found.'));
    res.json(client);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /coach/clients/:id
 * Update client profile fields.
 */
router.put('/clients/:id', async (req, res, next) => {
  try {
    const { name, goal, notes, age, gender, bodyWeight } = req.body;

    const existing = await prisma.clientProfile.findFirst({
      where: { id: req.params.id, coachId: req.coach.id }
    });
    if (!existing) return next(new NotFoundError('Client not found.'));

    const VALID_GOALS = ['BUILD_MUSCLE', 'LOSE_FAT', 'GET_STRONGER', 'GENERAL_FITNESS'];
    if (goal !== undefined && goal !== null && !VALID_GOALS.includes(goal)) {
      return next(new BadRequestError(`goal must be one of: ${VALID_GOALS.join(', ')}`));
    }

    const updated = await prisma.clientProfile.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(goal !== undefined && { goal }),
        ...(notes !== undefined && { notes }),
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

/**
 * DELETE /coach/clients/:id
 * Soft-deactivate a client. Data is preserved, isActive → false.
 */
router.delete('/clients/:id', async (req, res, next) => {
  try {
    const existing = await prisma.clientProfile.findFirst({
      where: { id: req.params.id, coachId: req.coach.id }
    });
    if (!existing) return next(new NotFoundError('Client not found.'));

    await prisma.clientProfile.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Client removed. Their data is preserved and they can be re-invited later.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /coach/invite
 * Generate a COACH_TO_CLIENT invitation link.
 */
router.post('/invite', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.create({
      data: {
        type: 'COACH_TO_CLIENT',
        coachId: req.coach.id,
      }
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.json({
      inviteCode: invitation.inviteCode,
      inviteLink: `${clientUrl}/register?invite=${invitation.inviteCode}`,
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;

