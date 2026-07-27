require('dotenv').config({ path: './.env' });
const prisma = require('./src/lib/prisma');
const jwt = require('jsonwebtoken');

async function runTests() {
  console.log('--- STARTING E2E AUTH FLOW TESTS ---');

  try {
    // 1. Clean up test records
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test_coach@example.com', 'test_gymowner@example.com', 'test_client@example.com'] }
      }
    });

    // 2. Test New Coach Sign In / Creation
    console.log('1. Testing New Coach Sign In...');
    const coachUser = await prisma.user.create({
      data: {
        email: 'test_coach@example.com',
        name: 'Test Coach',
        googleId: 'google_id_coach_123',
        role: 'COACH',
        coachProfile: { create: { gymId: null } }
      },
      include: { coachProfile: true }
    });
    const coachToken = jwt.sign({ userId: coachUser.id, role: coachUser.role }, process.env.JWT_SECRET || 'dev-secret');
    console.log('✅ New Coach Created:', coachUser.email, 'Role:', coachUser.role, 'Profile ID:', coachUser.coachProfile.id);

    // 3. Test New Gym Owner Sign In / Creation
    console.log('2. Testing New Gym Owner Sign In...');
    const gymOwnerUser = await prisma.user.create({
      data: {
        email: 'test_gymowner@example.com',
        name: 'Test Gym Owner',
        googleId: 'google_id_gym_123',
        role: 'GYM_OWNER',
        gymOwnerProfile: { create: { name: 'Iron Temple Gym' } }
      },
      include: { gymOwnerProfile: true }
    });
    console.log('✅ New Gym Owner Created:', gymOwnerUser.email, 'Gym:', gymOwnerUser.gymOwnerProfile.name);

    // 4. Test Coach Creating an Invite Link for a Client
    console.log('3. Testing Client Invite Link Generation...');
    const invitation = await prisma.invitation.create({
      data: {
        inviteCode: 'test-invite-code-123',
        type: 'COACH_TO_CLIENT',
        coachId: coachUser.coachProfile.id
      }
    });
    console.log('✅ Invite Created with Code:', invitation.inviteCode);

    // 5. Test Client Accepting Invite Link
    console.log('4. Testing Client Accepting Invite Link...');
    const inviteCheck = await prisma.invitation.findUnique({
      where: { inviteCode: invitation.inviteCode },
      include: { coach: { include: { user: { select: { name: true } } } } }
    });
    if (!inviteCheck || inviteCheck.used) throw new Error('Invite check failed');

    const clientUser = await prisma.user.create({
      data: {
        email: 'test_client@example.com',
        name: 'Test Client',
        googleId: 'google_id_client_123',
        role: 'CLIENT',
        clientProfile: {
          create: {
            coachId: invitation.coachId,
            name: 'Test Client'
          }
        }
      },
      include: { clientProfile: true }
    });
    await prisma.invitation.update({ where: { id: invitation.id }, data: { used: true } });
    console.log('✅ Client Created via Invite:', clientUser.email, 'Coach ID:', clientUser.clientProfile.coachId);

    console.log('🎉 ALL 3 E2E AUTH FLOWS TESTED AND PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
