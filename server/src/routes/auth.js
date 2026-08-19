require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../lib/prisma');
const { BadRequestError, NotFoundError } = require('../lib/errors');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const issueToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

/**
 * POST /auth/google
 * Body: { credential, inviteCode?, role? }
 *
 * Decision tree:
 * 1. Existing user (googleId or email match) → sign in regardless of invite/role
 * 2. New + inviteCode:
 *    - GYM_TO_COACH   → create COACH with gymId from invite
 *    - COACH_TO_CLIENT → reactivate if existing inactive profile, else create CLIENT
 * 3. New + no invite + role === 'GYM_OWNER' → create User + Gym
 * 4. New + no invite + role === 'COACH'     → create User + CoachProfile (gymId: null)
 * 5. New + no invite + no role → 400 (never silently default)
 */
router.post('/google', async (req, res, next) => {
  try {
    const { credential, inviteCode, role: bodyRole, gymName } = req.body;

    if (!credential) return next(new BadRequestError('Missing Google credential.'));

    // Verify Google ID Token (JWT)
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    if (!email) return next(new BadRequestError('Google account has no email.'));

    // ── 1. Existing user ────────────────────────────────────────────────────
    let user = await prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user && !user.googleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
      }
    }

    if (user) {
      if (inviteCode) {
        const invitation = await prisma.invitation.findUnique({ where: { inviteCode: inviteCode.trim() } });
        if (!invitation) return next(new BadRequestError('Invalid invite link.'));
        if (invitation.used) return next(new BadRequestError('This invite link has already been used.'));

        if (invitation.type === 'COACH_TO_CLIENT') {
          if (user.role !== 'CLIENT') {
            return next(new BadRequestError('This invite link is for client accounts.'));
          }
          let clientProfile = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
          if (!clientProfile) {
            clientProfile = await prisma.clientProfile.create({
              data: {
                userId: user.id,
                name: user.name,
                coachId: invitation.coachId,
                isActive: true,
              }
            });
          } else {
            if (clientProfile.coachId && clientProfile.coachId !== invitation.coachId) {
              return next(new BadRequestError('You are already assigned to a personal trainer. Please leave your current trainer before joining a new one.'));
            }
            await prisma.clientProfile.update({
              where: { id: clientProfile.id },
              data: { coachId: invitation.coachId, isActive: true }
            });
          }
          await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        } else if (invitation.type === 'GYM_TO_CLIENT') {
          if (user.role !== 'CLIENT') {
            return next(new BadRequestError('This invite link is for client accounts.'));
          }
          let clientProfile = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
          if (!clientProfile) {
            clientProfile = await prisma.clientProfile.create({
              data: { userId: user.id, name: user.name }
            });
          }
          const activeMembership = await prisma.gymMembership.findFirst({
            where: { clientId: clientProfile.id, isActive: true }
          });
          if (activeMembership && activeMembership.gymId !== invitation.gymId) {
            return next(new BadRequestError('You are already a member of a gym facility. Please leave your current gym before joining a new one.'));
          }
          await prisma.gymMembership.upsert({
            where: { clientId_gymId: { clientId: clientProfile.id, gymId: invitation.gymId } },
            create: { clientId: clientProfile.id, gymId: invitation.gymId, type: 'GENERAL', isActive: true },
            update: { isActive: true }
          });
          await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        } else if (invitation.type === 'GYM_TO_COACH') {
          if (user.role !== 'COACH') {
            return next(new BadRequestError('This invite link is for trainer accounts.'));
          }
          await prisma.coachProfile.update({
            where: { userId: user.id },
            data: { gymId: invitation.gymId }
          });
          await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        }
      }

      const token = issueToken(user);
      return res.json({ token, role: user.role, name: user.name });
    }

    // ── 2. New user with invite code ────────────────────────────────────────
    if (inviteCode) {
      const invitation = await prisma.invitation.findUnique({ where: { inviteCode } });
      if (!invitation) return next(new BadRequestError('Invalid invite link.'));
      if (invitation.used) return next(new BadRequestError('This invite link has already been used.'));

      // GYM_TO_COACH invite
      if (invitation.type === 'GYM_TO_COACH') {
        const newUser = await prisma.user.create({
          data: {
            email, name, googleId,
            role: 'COACH',
            coachProfile: {
              create: { gymId: invitation.gymId }
            }
          }
        });
        await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        const token = issueToken(newUser);
        return res.json({ token, role: newUser.role, name: newUser.name });
      }

      // GYM_TO_CLIENT invite
      if (invitation.type === 'GYM_TO_CLIENT') {
        const newUser = await prisma.user.create({
          data: {
            email, name, googleId,
            role: 'CLIENT',
            clientProfile: {
              create: {
                name,
                memberships: {
                  create: {
                    gymId: invitation.gymId,
                    type: 'GENERAL',
                    isActive: true,
                    startDate: new Date()
                  }
                }
              }
            }
          }
        });
        await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        const token = issueToken(newUser);
        return res.json({ token, role: newUser.role, name: newUser.name });
      }

      // COACH_TO_CLIENT invite — check for existing inactive profile first
      if (invitation.type === 'COACH_TO_CLIENT') {
        const existingInactive = await prisma.clientProfile.findFirst({
          where: { user: { email }, isActive: false },
          include: { user: true }
        });

        if (existingInactive) {
          // Reactivate — update coachId, keep all history
          await prisma.$transaction([
            prisma.clientProfile.update({
              where: { id: existingInactive.id },
              data: { isActive: true, coachId: invitation.coachId }
            }),
            prisma.user.update({
              where: { id: existingInactive.user.id },
              data: { googleId: existingInactive.user.googleId || googleId }
            }),
            prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } })
          ]);
          const token = issueToken(existingInactive.user);
          return res.json({ token, role: 'CLIENT', name: existingInactive.user.name });
        }

        // New client
        const newUser = await prisma.user.create({
          data: {
            email, name, googleId,
            role: 'CLIENT',
            clientProfile: {
              create: {
                coachId: invitation.coachId,
                name,
              }
            }
          }
        });
        await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
        const token = issueToken(newUser);
        return res.json({ token, role: newUser.role, name: newUser.name });
      }
    }

    // ── 3. New GYM_OWNER ────────────────────────────────────────────────────
    if (bodyRole === 'GYM_OWNER') {
      const resolvedGymName = (gymName || '').trim() || `${name}'s Gym`;
      const newUser = await prisma.user.create({
        data: {
          email, name, googleId,
          role: 'GYM_OWNER',
          gymOwnerProfile: {
            create: { name: resolvedGymName }
          }
        }
      });
      const token = issueToken(newUser);
      return res.json({ token, role: newUser.role, name: newUser.name });
    }

    // ── 4. New independent COACH ────────────────────────────────────────────
    if (bodyRole === 'COACH') {
      const newUser = await prisma.user.create({
        data: {
          email, name, googleId,
          role: 'COACH',
          coachProfile: {
            create: { gymId: null }
          }
        }
      });
      const token = issueToken(newUser);
      return res.json({ token, role: newUser.role, name: newUser.name });
    }

    // ── 5. No valid path → block ────────────────────────────────────────────
    return next(new BadRequestError(
      'No invite code and no role selected. ' +
      'If you are a coach or gym owner, choose your role on the login page. ' +
      'Clients must use an invite link from their trainer.'
    ));

  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/validate-invite/:code
 * Returns invite type + context (gym name or coach name) — used by RegisterPage.
 */
router.get('/validate-invite/:code', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode: req.params.code },
      include: {
        gym: { select: { name: true } },
        coach: { include: { user: { select: { name: true } } } }
      }
    });

    if (!invitation) return next(new NotFoundError('Invalid invite link.'));
    if (invitation.used) return next(new BadRequestError('This invite link has already been used.'));

    res.json({
      valid: true,
      type: invitation.type,
      gymName: invitation.gym?.name || null,
      coachName: invitation.coach?.user?.name || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Returns the current user with their profile.
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        gymOwnerProfile: true,
        coachProfile: { include: { gym: { select: { id: true, name: true } } } },
        clientProfile: {
          include: {
            coach: { include: { user: { select: { name: true, email: true } } } }
          }
        }
      }
    });
    if (!user) return next(new NotFoundError('User not found.'));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/dev-login
 * Development mode helper for quick local sign-in without external OAuth requirements
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', async (req, res, next) => {
    try {
      const { role = 'COACH', gymName } = req.body;
      const email = `dev_${role.toLowerCase()}@gainchek.local`;
      const name = role === 'GYM_OWNER' ? 'Demo Gym Owner' : role === 'COACH' ? 'Demo Trainer' : 'Demo Client';

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        if (role === 'GYM_OWNER') {
          user = await prisma.user.create({
            data: {
              email, name, role: 'GYM_OWNER',
              gymOwnerProfile: { create: { name: gymName || 'GainChek Iron Gym' } }
            }
          });
        } else if (role === 'COACH') {
          user = await prisma.user.create({
            data: {
              email, name, role: 'COACH',
              coachProfile: { create: { gymId: null } }
            }
          });
        } else {
          // CLIENT
          const defaultCoach = await prisma.user.create({
            data: {
              email: `dev_coach_${Date.now()}@gainchek.local`,
              name: 'Coach Alex',
              role: 'COACH',
              coachProfile: { create: { gymId: null } }
            },
            include: { coachProfile: true }
          });

          user = await prisma.user.create({
            data: {
              email, name, role: 'CLIENT',
              clientProfile: {
                create: {
                  name,
                  coachId: defaultCoach.coachProfile.id
                }
              }
            }
          });
        }
      }

      const token = issueToken(user);
      return res.json({ token, role: user.role, name: user.name });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
