/**
 * GainChek v2 Seed Script
 * Creates deterministic test data covering every path in the app.
 *
 * Entities created:
 *  - Gym "Iron Temple" + gym owner
 *  - Coach A (gym-affiliated) with 2 clients
 *  - Coach B (independent, gymId: null) with 2 clients
 *  - GymMemberships for gym clients
 *  - WorkoutPlans with splits, exercises, sets for each client
 *  - WorkoutLogs + BodyWeightLogs (30-day history)
 *  - Announcements
 *  - Invitations (used + pending of each type)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Stable IDs ──────────────────────────────────────────────────────────────
const IDS = {
  // Users
  gymOwnerUser:   'seed-user-gym-owner-0000000000001',
  coachAUser:     'seed-user-coach-a-00000000000001',
  coachBUser:     'seed-user-coach-b-00000000000001',
  clientA1User:   'seed-user-client-a1-0000000000001',
  clientA2User:   'seed-user-client-a2-0000000000001',
  clientB1User:   'seed-user-client-b1-0000000000001',
  clientB2User:   'seed-user-client-b2-0000000000001',

  // Gym + Profiles
  gym:          'seed-gym-iron-temple-000000000001',
  coachAProfile: 'seed-coach-profile-a-00000000001',
  coachBProfile: 'seed-coach-profile-b-00000000001',
  clientA1Profile: 'seed-client-profile-a1-0000000001',
  clientA2Profile: 'seed-client-profile-a2-0000000001',
  clientB1Profile: 'seed-client-profile-b1-0000000001',
  clientB2Profile: 'seed-client-profile-b2-0000000001',

  // Workout Plans
  planA1: 'seed-plan-a1-000000000000000001',
  planA2: 'seed-plan-a2-000000000000000001',
  planB1: 'seed-plan-b1-000000000000000001',
  planB2: 'seed-plan-b2-000000000000000001',

  // Invitations
  invGymToCoach: 'seed-inv-gym-to-coach-000000001',
  invCoachToClient: 'seed-inv-coach-to-client-00001',
};

async function main() {
  console.log('🌱 Seeding GainChek v2...');

  // ─── 1. Gym Owner ────────────────────────────────────────────────────────
  const gymOwner = await prisma.user.upsert({
    where: { id: IDS.gymOwnerUser },
    update: {},
    create: {
      id: IDS.gymOwnerUser,
      email: 'owner@irontemple.com',
      name: 'Arjun Sharma',
      role: 'GYM_OWNER',
      gymOwnerProfile: {
        create: {
          id: IDS.gym,
          name: 'Iron Temple',
        }
      }
    }
  });
  console.log('✓ Gym owner + Gym created');

  // ─── 2. Coach A (gym-affiliated) ─────────────────────────────────────────
  const coachA = await prisma.user.upsert({
    where: { id: IDS.coachAUser },
    update: {},
    create: {
      id: IDS.coachAUser,
      email: 'ravi@irontemple.com',
      name: 'Ravi Verma',
      role: 'COACH',
      coachProfile: {
        create: {
          id: IDS.coachAProfile,
          gymId: IDS.gym,
        }
      }
    }
  });
  console.log('✓ Coach A (gym-affiliated) created');

  // ─── 3. Coach B (independent) ────────────────────────────────────────────
  const coachB = await prisma.user.upsert({
    where: { id: IDS.coachBUser },
    update: {},
    create: {
      id: IDS.coachBUser,
      email: 'priya@independentfit.com',
      name: 'Priya Singh',
      role: 'COACH',
      coachProfile: {
        create: {
          id: IDS.coachBProfile,
          gymId: null,
        }
      }
    }
  });
  console.log('✓ Coach B (independent) created');

  // ─── 4. Clients for Coach A ───────────────────────────────────────────────
  await prisma.user.upsert({
    where: { id: IDS.clientA1User },
    update: {},
    create: {
      id: IDS.clientA1User,
      email: 'amit.k@example.com',
      name: 'Amit Kumar',
      role: 'CLIENT',
      clientProfile: {
        create: {
          id: IDS.clientA1Profile,
          coachId: IDS.coachAProfile,
          name: 'Amit Kumar',
          goal: 'BUILD_MUSCLE',
          age: 26,
          gender: 'Male',
          bodyWeight: 72,
          notes: 'No shoulder injuries. Prefers morning sessions.',
          isActive: true,
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { id: IDS.clientA2User },
    update: {},
    create: {
      id: IDS.clientA2User,
      email: 'neha.m@example.com',
      name: 'Neha Mishra',
      role: 'CLIENT',
      clientProfile: {
        create: {
          id: IDS.clientA2Profile,
          coachId: IDS.coachAProfile,
          name: 'Neha Mishra',
          goal: 'LOSE_FAT',
          age: 29,
          gender: 'Female',
          bodyWeight: 63,
          isActive: true,
        }
      }
    }
  });
  console.log('✓ Coach A clients created');

  // ─── 5. Clients for Coach B ───────────────────────────────────────────────
  await prisma.user.upsert({
    where: { id: IDS.clientB1User },
    update: {},
    create: {
      id: IDS.clientB1User,
      email: 'rohit.g@example.com',
      name: 'Rohit Gupta',
      role: 'CLIENT',
      clientProfile: {
        create: {
          id: IDS.clientB1Profile,
          coachId: IDS.coachBProfile,
          name: 'Rohit Gupta',
          goal: 'GET_STRONGER',
          age: 31,
          gender: 'Male',
          bodyWeight: 85,
          isActive: true,
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { id: IDS.clientB2User },
    update: {},
    create: {
      id: IDS.clientB2User,
      email: 'sara.p@example.com',
      name: 'Sara Patel',
      role: 'CLIENT',
      clientProfile: {
        create: {
          id: IDS.clientB2Profile,
          coachId: IDS.coachBProfile,
          name: 'Sara Patel',
          goal: 'GENERAL_FITNESS',
          age: 24,
          gender: 'Female',
          bodyWeight: 55,
          isActive: true,
        }
      }
    }
  });
  console.log('✓ Coach B clients created');

  // ─── 6. Gym Memberships ───────────────────────────────────────────────────
  await prisma.gymMembership.upsert({
    where: { clientId_gymId: { clientId: IDS.clientA1Profile, gymId: IDS.gym } },
    update: {},
    create: {
      clientId: IDS.clientA1Profile,
      gymId: IDS.gym,
      type: 'BOTH',
      isActive: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    }
  });

  await prisma.gymMembership.upsert({
    where: { clientId_gymId: { clientId: IDS.clientA2Profile, gymId: IDS.gym } },
    update: {},
    create: {
      clientId: IDS.clientA2Profile,
      gymId: IDS.gym,
      type: 'GENERAL',
      isActive: false, // pending payment
    }
  });
  console.log('✓ Gym memberships created');

  // ─── 7. Announcements ─────────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      {
        gymId: IDS.gym,
        message: 'Gym will be closed on Republic Day (Jan 26). Stay consistent!',
        createdAt: new Date('2026-01-20'),
      },
      {
        gymId: IDS.gym,
        message: 'New Olympic barbells and plates have arrived. First come, first serve!',
        createdAt: new Date('2026-07-01'),
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Announcements created');

  // ─── 8. Invitations ───────────────────────────────────────────────────────
  await prisma.invitation.upsert({
    where: { id: IDS.invGymToCoach },
    update: {},
    create: {
      id: IDS.invGymToCoach,
      inviteCode: 'SEED-GYM-TO-COACH-PENDING',
      type: 'GYM_TO_COACH',
      gymId: IDS.gym,
      used: false,
    }
  });

  await prisma.invitation.upsert({
    where: { id: IDS.invCoachToClient },
    update: {},
    create: {
      id: IDS.invCoachToClient,
      inviteCode: 'SEED-COACH-TO-CLIENT-PENDING',
      type: 'COACH_TO_CLIENT',
      coachId: IDS.coachAProfile,
      used: false,
    }
  });
  console.log('✓ Invitations created');

  // ─── 9. Workout Plans + Splits + Exercises + Sets ─────────────────────────
  async function createPlan(planId, coachId, clientId, title, splits) {
    const existing = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (existing) return existing;

    return prisma.workoutPlan.create({
      data: {
        id: planId,
        coachId,
        clientId,
        title,
        isActive: true,
        isTemplate: false,
        workoutSplits: {
          create: splits.map(s => ({
            day: s.day,
            name: s.name || null,
            isRestDay: s.isRestDay || false,
            muscleGroups: s.muscleGroups || null,
            exercises: s.isRestDay ? undefined : {
              create: (s.exercises || []).map((ex, exIdx) => ({
                name: ex.name,
                muscleGroup: ex.muscleGroup,
                order: exIdx,
                exerciseSets: {
                  create: (ex.sets || []).map((set, setIdx) => ({
                    setNumber: setIdx + 1,
                    reps: set.reps,
                    weight: set.weight || null,
                  }))
                }
              }))
            }
          }))
        }
      }
    });
  }

  await createPlan(IDS.planA1, IDS.coachAProfile, IDS.clientA1Profile, 'Push-Pull-Legs', [
    {
      day: 'Monday', name: 'Push Day', muscleGroups: 'Chest, Shoulders, Triceps',
      exercises: [
        { name: 'Flat Barbell Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 85 }, { reps: 6, weight: 85 }] },
        { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: [{ reps: 10, weight: 30 }, { reps: 10, weight: 30 }, { reps: 8, weight: 32 }] },
        { name: 'Overhead Press (Barbell)', muscleGroup: 'Shoulders', sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }, { reps: 6, weight: 55 }] },
        { name: 'Tricep Pushdown (Cable)', muscleGroup: 'Triceps', sets: [{ reps: 12, weight: 25 }, { reps: 12, weight: 25 }, { reps: 10, weight: 27 }] },
      ]
    },
    {
      day: 'Tuesday', name: 'Pull Day', muscleGroups: 'Back, Biceps',
      exercises: [
        { name: 'Conventional Deadlift', muscleGroup: 'Back', sets: [{ reps: 5, weight: 120 }, { reps: 5, weight: 120 }, { reps: 3, weight: 130 }] },
        { name: 'Pull-Ups', muscleGroup: 'Back', sets: [{ reps: 8 }, { reps: 7 }, { reps: 6 }] },
        { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: [{ reps: 10, weight: 30 }, { reps: 10, weight: 30 }, { reps: 8, weight: 32 }] },
      ]
    },
    {
      day: 'Wednesday', name: 'Leg Day', muscleGroups: 'Quads, Hamstrings, Glutes',
      exercises: [
        { name: 'Back Squat', muscleGroup: 'Quads', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 6, weight: 105 }, { reps: 6, weight: 105 }] },
        { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }, { reps: 8, weight: 85 }] },
        { name: 'Leg Press', muscleGroup: 'Quads', sets: [{ reps: 12, weight: 150 }, { reps: 12, weight: 150 }, { reps: 10, weight: 160 }] },
      ]
    },
    { day: 'Thursday', isRestDay: true },
    {
      day: 'Friday', name: 'Push Day (repeat)', muscleGroups: 'Chest, Shoulders, Triceps',
      exercises: [
        { name: 'Flat Barbell Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 82 }, { reps: 8, weight: 82 }, { reps: 6, weight: 87 }] },
        { name: 'Cable Fly', muscleGroup: 'Chest', sets: [{ reps: 12, weight: 15 }, { reps: 12, weight: 15 }, { reps: 10, weight: 17 }] },
        { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [{ reps: 15, weight: 10 }, { reps: 15, weight: 10 }, { reps: 12, weight: 12 }] },
      ]
    },
    { day: 'Saturday', isRestDay: true },
    { day: 'Sunday', isRestDay: true },
  ]);

  await createPlan(IDS.planA2, IDS.coachAProfile, IDS.clientA2Profile, 'Full Body Fat Loss', [
    {
      day: 'Monday', name: 'Full Body A', muscleGroups: 'Chest, Back, Legs',
      exercises: [
        { name: 'Goblet Squat', muscleGroup: 'Legs', sets: [{ reps: 15, weight: 20 }, { reps: 15, weight: 20 }, { reps: 12, weight: 24 }] },
        { name: 'Dumbbell Row', muscleGroup: 'Back', sets: [{ reps: 12, weight: 18 }, { reps: 12, weight: 18 }, { reps: 10, weight: 20 }] },
        { name: 'Push-Up', muscleGroup: 'Chest', sets: [{ reps: 15 }, { reps: 15 }, { reps: 12 }] },
      ]
    },
    { day: 'Tuesday', isRestDay: true },
    {
      day: 'Wednesday', name: 'Full Body B', muscleGroups: 'Shoulders, Core, Legs',
      exercises: [
        { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', sets: [{ reps: 12, weight: 12 }, { reps: 12, weight: 12 }, { reps: 10, weight: 14 }] },
        { name: 'Plank', muscleGroup: 'Core', sets: [{ reps: 60 }, { reps: 60 }, { reps: 45 }] },
        { name: 'Reverse Lunge', muscleGroup: 'Legs', sets: [{ reps: 12, weight: 14 }, { reps: 12, weight: 14 }] },
      ]
    },
    { day: 'Thursday', isRestDay: true },
    {
      day: 'Friday', name: 'Full Body C', muscleGroups: 'Back, Biceps, Core',
      exercises: [
        { name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ reps: 12, weight: 45 }, { reps: 12, weight: 45 }, { reps: 10, weight: 50 }] },
        { name: 'Hammer Curl', muscleGroup: 'Biceps', sets: [{ reps: 12, weight: 12 }, { reps: 12, weight: 12 }] },
        { name: 'Dead Bug', muscleGroup: 'Core', sets: [{ reps: 10 }, { reps: 10 }] },
      ]
    },
    { day: 'Saturday', isRestDay: true },
    { day: 'Sunday', isRestDay: true },
  ]);

  await createPlan(IDS.planB1, IDS.coachBProfile, IDS.clientB1Profile, 'Strength Program', [
    {
      day: 'Monday', name: 'Squat Day', muscleGroups: 'Quads, Glutes',
      exercises: [
        { name: 'Back Squat', muscleGroup: 'Quads', sets: [{ reps: 5, weight: 120 }, { reps: 5, weight: 130 }, { reps: 5, weight: 140 }, { reps: 3, weight: 150 }, { reps: 3, weight: 155 }] },
        { name: 'Front Squat', muscleGroup: 'Quads', sets: [{ reps: 5, weight: 90 }, { reps: 5, weight: 90 }, { reps: 5, weight: 95 }] },
      ]
    },
    { day: 'Tuesday', isRestDay: true },
    {
      day: 'Wednesday', name: 'Bench Day', muscleGroups: 'Chest, Triceps',
      exercises: [
        { name: 'Flat Barbell Bench Press', muscleGroup: 'Chest', sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 105 }, { reps: 5, weight: 110 }, { reps: 3, weight: 115 }] },
        { name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 85 }] },
      ]
    },
    { day: 'Thursday', isRestDay: true },
    {
      day: 'Friday', name: 'Deadlift Day', muscleGroups: 'Back, Hamstrings',
      exercises: [
        { name: 'Conventional Deadlift', muscleGroup: 'Back', sets: [{ reps: 5, weight: 150 }, { reps: 5, weight: 160 }, { reps: 3, weight: 170 }, { reps: 1, weight: 180 }] },
        { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 8, weight: 105 }] },
      ]
    },
    { day: 'Saturday', isRestDay: true },
    { day: 'Sunday', isRestDay: true },
  ]);

  await createPlan(IDS.planB2, IDS.coachBProfile, IDS.clientB2Profile, 'General Fitness Plan', [
    {
      day: 'Monday', name: 'Upper Body', muscleGroups: 'Chest, Back, Shoulders',
      exercises: [
        { name: 'Push-Up', muscleGroup: 'Chest', sets: [{ reps: 15 }, { reps: 15 }, { reps: 12 }] },
        { name: 'Dumbbell Row', muscleGroup: 'Back', sets: [{ reps: 12, weight: 10 }, { reps: 12, weight: 10 }] },
        { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [{ reps: 15, weight: 5 }, { reps: 15, weight: 5 }] },
      ]
    },
    { day: 'Tuesday', isRestDay: true },
    {
      day: 'Wednesday', name: 'Lower Body', muscleGroups: 'Quads, Glutes, Core',
      exercises: [
        { name: 'Bodyweight Squat', muscleGroup: 'Quads', sets: [{ reps: 20 }, { reps: 20 }, { reps: 20 }] },
        { name: 'Glute Bridge', muscleGroup: 'Glutes', sets: [{ reps: 20 }, { reps: 20 }] },
        { name: 'Plank', muscleGroup: 'Core', sets: [{ reps: 45 }, { reps: 45 }] },
      ]
    },
    { day: 'Thursday', isRestDay: true },
    {
      day: 'Friday', name: 'Full Body', muscleGroups: 'Full Body',
      exercises: [
        { name: 'Burpee', muscleGroup: 'Full Body', sets: [{ reps: 10 }, { reps: 10 }, { reps: 8 }] },
        { name: 'Mountain Climbers', muscleGroup: 'Full Body', sets: [{ reps: 20 }, { reps: 20 }] },
      ]
    },
    { day: 'Saturday', isRestDay: true },
    { day: 'Sunday', isRestDay: true },
  ]);
  console.log('✓ Workout plans created');

  // ─── 10. Body Weight Logs (30-day history for all clients) ────────────────
  const clientWeightMap = [
    { id: IDS.clientA1Profile, base: 72 },
    { id: IDS.clientA2Profile, base: 63 },
    { id: IDS.clientB1Profile, base: 85 },
    { id: IDS.clientB2Profile, base: 55 },
  ];

  for (const { id: clientId, base } of clientWeightMap) {
    const existingLogs = await prisma.bodyWeightLog.findFirst({ where: { clientId } });
    if (!existingLogs) {
      const logs = Array.from({ length: 28 }, (_, i) => ({
        clientId,
        weight: Math.round(base + (Math.random() * 2 - 1)),
        loggedAt: new Date(Date.now() - (27 - i) * 86400000),
      }));
      await prisma.bodyWeightLog.createMany({ data: logs });
    }
  }
  console.log('✓ Body weight logs created');

  // ─── 11. Workout Logs (sample history) ────────────────────────────────────
  // Fetch the plan data so we have split + exercise IDs
  const planA1Full = await prisma.workoutPlan.findUnique({
    where: { id: IDS.planA1 },
    include: { workoutSplits: { include: { exercises: { include: { exerciseSets: true } } } } }
  });

  const workSplit = planA1Full?.workoutSplits?.find(s => !s.isRestDay && s.exercises.length > 0);
  if (workSplit) {
    const existing = await prisma.workoutLog.findFirst({ where: { clientId: IDS.clientA1Profile } });
    if (!existing) {
      for (let i = 0; i < 10; i++) {
        await prisma.workoutLog.create({
          data: {
            clientId: IDS.clientA1Profile,
            planId: IDS.planA1,
            splitId: workSplit.id,
            loggedAt: new Date(Date.now() - i * 3 * 86400000),
            exerciseLogs: {
              create: workSplit.exercises.flatMap(ex =>
                ex.exerciseSets.map(s => ({
                  exerciseId: ex.id,
                  setNumber: s.setNumber,
                  weightUsed: s.weight,
                  repsActual: s.reps,
                }))
              )
            }
          }
        });
      }
      console.log('✓ Workout logs created');
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts (Google login needed — or set googleId manually):');
  console.log('  Gym Owner : owner@irontemple.com');
  console.log('  Coach A   : ravi@irontemple.com (Iron Temple)');
  console.log('  Coach B   : priya@independentfit.com (independent)');
  console.log('  Client A1 : amit.k@example.com');
  console.log('  Client A2 : neha.m@example.com');
  console.log('  Client B1 : rohit.g@example.com');
  console.log('  Client B2 : sara.p@example.com');
  console.log('\nPending invite codes:');
  console.log('  GYM_TO_COACH   : SEED-GYM-TO-COACH-PENDING');
  console.log('  COACH_TO_CLIENT: SEED-COACH-TO-CLIENT-PENDING');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
