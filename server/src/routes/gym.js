const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole, requireGymOwnership } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();

// All gym routes: must be authenticated + GYM_OWNER role + gym exists
router.use(authenticateToken, requireRole('GYM_OWNER'), requireGymOwnership);

// ─── Trainer Management ───────────────────────────────────────────────────────

/**
 * GET /gym/trainers
 * List all coaches in this gym with their active client counts.
 */
router.get('/trainers', async (req, res, next) => {
  try {
    const coaches = await prisma.coachProfile.findMany({
      where: { gymId: req.gym.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { clients: { where: { isActive: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(coaches.map(c => ({
      id: c.id,
      userId: c.userId,
      name: c.user.name,
      email: c.user.email,
      createdAt: c.createdAt,
      activeClientCount: c._count.clients,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /gym/trainers/invite
 * Generate a GYM_TO_COACH invitation link.
 */
router.post('/trainers/invite', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.create({
      data: {
        type: 'GYM_TO_COACH',
        gymId: req.gym.id,
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

/**
 * DELETE /gym/trainers/:coachId
 * Remove a trainer from the gym.
 * Body: { keepClients: boolean }
 *
 * If keepClients = true:  trainer goes independent (gymId = null), keeps their clients.
 * If keepClients = false: trainer goes independent, their clients' coachId becomes null
 *                         (gym owner must reassign them).
 */
router.delete('/trainers/:coachId', async (req, res, next) => {
  try {
    const { keepClients } = req.body;
    if (typeof keepClients !== 'boolean') {
      return next(new BadRequestError('keepClients (boolean) is required.'));
    }

    const coach = await prisma.coachProfile.findFirst({
      where: { id: req.params.coachId, gymId: req.gym.id }
    });
    if (!coach) return next(new NotFoundError('Trainer not found in this gym.'));

    if (keepClients) {
      // Trainer becomes independent, keeps clients
      await prisma.coachProfile.update({
        where: { id: coach.id },
        data: { gymId: null }
      });
    } else {
      // Trainer goes independent AND their clients become unassigned
      // We need a placeholder — set coachId to null isn't possible (FK required).
      // Instead: deactivate all their active clients so gym owner can reassign.
      await prisma.$transaction([
        prisma.coachProfile.update({
          where: { id: coach.id },
          data: { gymId: null }
        }),
        prisma.clientProfile.updateMany({
          where: { coachId: coach.id, isActive: true },
          data: { isActive: false }
        })
      ]);
    }

    res.json({ message: keepClients
      ? 'Trainer removed from gym. They are now independent and keep their clients.'
      : 'Trainer removed from gym. Their clients have been deactivated for reassignment.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /gym/trainers/reassign
 * Reassign a client from one coach to another within the same gym.
 * Body: { clientId, toCoachId }
 */
router.post('/trainers/reassign', async (req, res, next) => {
  try {
    const { clientId, toCoachId } = req.body;
    if (!clientId || !toCoachId) {
      return next(new BadRequestError('clientId and toCoachId are required.'));
    }

    // Verify target coach is in this gym
    const toCoach = await prisma.coachProfile.findFirst({
      where: { id: toCoachId, gymId: req.gym.id }
    });
    if (!toCoach) return next(new NotFoundError('Target trainer not found in this gym.'));

    // Verify client exists and their current coach is in this gym (or client is inactive/unassigned)
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: { coach: true }
    });
    if (!client) return next(new NotFoundError('Client not found.'));

    // Allow reassignment if: client's coach is in this gym, OR client is inactive
    const currentCoachInGym = client.coach?.gymId === req.gym.id;
    if (client.isActive && !currentCoachInGym) {
      return next(new ForbiddenError('Client does not belong to a trainer in your gym.'));
    }

    const updated = await prisma.clientProfile.update({
      where: { id: clientId },
      data: { coachId: toCoachId, isActive: true }
    });

    res.json({ message: 'Client reassigned successfully.', client: updated });
  } catch (err) {
    next(err);
  }
});

// ─── Client Visibility ────────────────────────────────────────────────────────

/**
 * GET /gym/clients
 * All active clients across all trainers in this gym.
 */
router.get('/clients', async (req, res, next) => {
  try {
    const clients = await prisma.clientProfile.findMany({
      where: {
        OR: [
          { coach: { gymId: req.gym.id } },
          { memberships: { some: { gymId: req.gym.id } } }
        ]
      },
      include: {
        user: { select: { email: true } },
        coach: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(clients.map(c => ({
      id: c.id,
      name: c.name,
      email: c.user?.email,
      goal: c.goal,
      bodyWeight: c.bodyWeight,
      isActive: c.isActive,
      trainerName: c.coach?.user?.name,
      coachId: c.coachId,
      createdAt: c.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /gym/clients/:clientId
 * Single client detail (scoped through gym's coaches).
 */
router.get('/clients/:clientId', async (req, res, next) => {
  try {
    const client = await prisma.clientProfile.findFirst({
      where: {
        id: req.params.clientId,
        OR: [
          { coach: { gymId: req.gym.id } },
          { memberships: { some: { gymId: req.gym.id } } }
        ]
      },
      include: {
        user: { select: { email: true } },
        coach: { include: { user: { select: { name: true } } } },
        workoutPlans: { where: { isTemplate: false }, orderBy: { createdAt: 'desc' }, take: 5 },
        bodyWeightLogs: { orderBy: { loggedAt: 'desc' }, take: 30 },
        memberships: { where: { gymId: req.gym.id } }
      }
    });
    if (!client) return next(new NotFoundError('Client not found in your gym.'));
    res.json(client);
  } catch (err) {
    next(err);
  }
});

// ─── Membership Management ────────────────────────────────────────────────────

/**
 * GET /gym/memberships
 * All memberships for this gym.
 */
router.get('/memberships', async (req, res, next) => {
  try {
    const { status } = req.query; // ?status=expired | ?status=active

    if (status === 'expired') {
      where.OR = [
        { isActive: false },
        { endDate: { lte: new Date() } }
      ];
    } else if (status === 'active') {
      where.isActive = true;
      where.OR = [{ endDate: null }, { endDate: { gt: new Date() } }];
    }

    const memberships = await prisma.gymMembership.findMany({
      where,
      include: {
        client: {
          include: {
            user: { select: { email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(memberships);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /gym/memberships
 * Create a membership record. Never auto-created — always manual.
 * Body: { clientId, type, isActive?, startDate?, endDate? }
 */
router.post('/memberships', async (req, res, next) => {
  try {
    const { clientId, type, isActive = false, startDate, endDate } = req.body;
    if (!clientId || !type) return next(new BadRequestError('clientId and type are required.'));

    const validTypes = ['GENERAL', 'PERSONAL_TRAINING', 'BOTH'];
    if (!validTypes.includes(type)) {
      return next(new BadRequestError(`type must be one of: ${validTypes.join(', ')}`));
    }

    // Verify client exists (they don't have to be in this gym's coaching network)
    const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
    if (!client) return next(new NotFoundError('Client not found.'));

    const membership = await prisma.gymMembership.upsert({
      where: { clientId_gymId: { clientId, gymId: req.gym.id } },
      update: { type, isActive, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null },
      create: {
        clientId,
        gymId: req.gym.id,
        type,
        isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }
    });
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /gym/memberships/:id
 * Update a membership (activate/deactivate, change type or dates).
 */
router.patch('/memberships/:id', async (req, res, next) => {
  try {
    const existing = await prisma.gymMembership.findFirst({
      where: { id: req.params.id, gymId: req.gym.id }
    });
    if (!existing) return next(new NotFoundError('Membership not found.'));

    const { type, isActive, startDate, endDate } = req.body;
    const updated = await prisma.gymMembership.update({
      where: { id: req.params.id },
      data: {
        ...(type !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /gym/memberships/:id
 * Deactivate a membership (soft — never hard-delete per data retention spec).
 */
router.delete('/memberships/:id', async (req, res, next) => {
  try {
    const existing = await prisma.gymMembership.findFirst({
      where: { id: req.params.id, gymId: req.gym.id }
    });
    if (!existing) return next(new NotFoundError('Membership not found.'));

    await prisma.gymMembership.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Membership deactivated.' });
  } catch (err) {
    next(err);
  }
});

// ─── Announcements ────────────────────────────────────────────────────────────

/**
 * GET /gym/announcements
 * All announcements for this gym, newest first.
 */
router.get('/announcements', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { gymId: req.gym.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /gym/announcements
 * Create an announcement.
 * Body: { message }
 */
router.post('/announcements', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return next(new BadRequestError('message is required.'));
    }
    const announcement = await prisma.announcement.create({
      data: { gymId: req.gym.id, message: message.trim() }
    });
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /gym/announcements/:id
 */
router.delete('/announcements/:id', async (req, res, next) => {
  try {
    const existing = await prisma.announcement.findFirst({
      where: { id: req.params.id, gymId: req.gym.id }
    });
    if (!existing) return next(new NotFoundError('Announcement not found.'));
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /gym/profile
 * Gym owner's gym details.
 */
router.get('/profile', async (req, res, next) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.gym.id },
      include: {
        owner: { select: { name: true, email: true } },
        _count: {
          select: {
            coaches: true,
            memberships: { where: { isActive: true } }
          }
        }
      }
    });
    res.json(gym);
  } catch (err) {
    next(err);
  }
});

module.exports = router;