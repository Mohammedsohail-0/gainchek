const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { UnauthorizedError, ForbiddenError, NotFoundError } = require('../lib/errors');

/**
 * Verifies the JWT and attaches req.user = { userId, role }.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next(new UnauthorizedError('No token provided.'));

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token.'));
  }
}

/**
 * Role gate — use after authenticateToken.
 * requireRole('GYM_OWNER') or requireRole('COACH', 'GYM_OWNER')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }
    next();
  };
}

/**
 * Resolves the caller's CoachProfile and verifies they own the client.
 * Attaches req.coach and req.clientProfile.
 * clientIdParam defaults to 'clientId' (from req.params.clientId or req.body.clientId).
 */
async function requireCoachOwnership(req, res, next) {
  try {
    const coach = await prisma.coachProfile.findUnique({
      where: { userId: req.user.userId }
    });
    if (!coach) return next(new NotFoundError('Coach profile not found.'));

    const clientId = req.params.clientId || req.params.id;
    if (!clientId) return next();

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId }
    });
    if (!client) return next(new NotFoundError('Client not found.'));
    if (client.coachId !== coach.id) return next(new ForbiddenError('Not authorized to access this client.'));

    req.coach = coach;
    req.clientProfile = client;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves gym from the authenticated GYM_OWNER.
 * Attaches req.gym.
 */
async function requireGymOwnership(req, res, next) {
  try {
    const gym = await prisma.gym.findUnique({
      where: { ownerId: req.user.userId }
    });
    if (!gym) return next(new NotFoundError('Gym not found.'));
    req.gym = gym;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves the coach for the current user and attaches req.coach.
 * Does NOT check client ownership — for routes that just need the coach profile.
 */
async function resolveCoach(req, res, next) {
  try {
    const coach = await prisma.coachProfile.findUnique({
      where: { userId: req.user.userId }
    });
    if (!coach) return next(new NotFoundError('Coach profile not found.'));
    req.coach = coach;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * resolveClient — dual-role access pattern (ported + generalized from v1 analytics.js).
 * - CLIENT: resolves to their own profile.
 * - COACH: requires ?clientId= and verifies ownership.
 * - GYM_OWNER: requires ?clientId=, verifies the client's coach is in their gym.
 * Attaches req.clientProfile.
 */
async function resolveClient(req, res, next) {
  try {
    if (req.user.role === 'CLIENT') {
      const client = await prisma.clientProfile.findUnique({
        where: { userId: req.user.userId }
      });
      if (!client) return next(new NotFoundError('Client profile not found.'));
      req.clientProfile = client;
      return next();
    }

    if (req.user.role === 'COACH') {
      const clientId = req.query.clientId || req.params.clientId;
      if (!clientId) return next(new ForbiddenError('clientId is required.'));
      const coach = await prisma.coachProfile.findUnique({ where: { userId: req.user.userId } });
      if (!coach) return next(new NotFoundError('Coach not found.'));
      const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
      if (!client || client.coachId !== coach.id) return next(new ForbiddenError('Not authorized.'));
      req.clientProfile = client;
      req.coach = coach;
      return next();
    }

    if (req.user.role === 'GYM_OWNER') {
      const clientId = req.query.clientId || req.params.clientId;
      if (!clientId) return next(new ForbiddenError('clientId is required.'));
      const gym = await prisma.gym.findUnique({ where: { ownerId: req.user.userId } });
      if (!gym) return next(new NotFoundError('Gym not found.'));
      const client = await prisma.clientProfile.findUnique({
        where: { id: clientId },
        include: { coach: true }
      });
      if (!client || client.coach?.gymId !== gym.id) return next(new ForbiddenError('Not authorized.'));
      req.clientProfile = client;
      req.gym = gym;
      return next();
    }

    next(new ForbiddenError('Not authorized.'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireCoachOwnership,
  requireGymOwnership,
  resolveCoach,
  resolveClient,
};
