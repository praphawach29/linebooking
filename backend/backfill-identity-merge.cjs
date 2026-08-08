// One-time backfill: find LINE-authenticated users and separate phone-linked
// (walk-in) users that share a phone number, and merge them so points/tier
// history is consolidated under the customer's real LINE account.
//
// Usage:
//   node backfill-identity-merge.cjs             (dry run — reports only)
//   node backfill-identity-merge.cjs --apply      (actually performs the merge)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

function computeMembershipTier(totalPointsEarned) {
  if (totalPointsEarned >= 1000) return 'Platinum';
  if (totalPointsEarned >= 500) return 'Gold';
  if (totalPointsEarned >= 100) return 'Silver';
  return 'Bronze';
}

async function mergeCandidate(tx, authUser, walkinUser) {
  await tx.booking.updateMany({
    where: { userId: walkinUser.id },
    data: { userId: authUser.id },
  });
  await tx.customerPackage.updateMany({
    where: { userId: walkinUser.id },
    data: { userId: authUser.id },
  });

  const walkinMemberships = await tx.membership.findMany({
    where: { userId: walkinUser.id },
  });

  for (const walkinMembership of walkinMemberships) {
    const authMembership = await tx.membership.findUnique({
      where: {
        tenantId_userId: { tenantId: walkinMembership.tenantId, userId: authUser.id },
      },
    });

    if (!authMembership) {
      await tx.membership.update({
        where: { id: walkinMembership.id },
        data: { userId: authUser.id },
      });
      continue;
    }

    const mergedTotalPointsEarned =
      (authMembership.totalPointsEarned || 0) + (walkinMembership.totalPointsEarned || 0);

    await tx.pointTransaction.updateMany({
      where: { membershipId: walkinMembership.id },
      data: { membershipId: authMembership.id },
    });

    await tx.membership.update({
      where: { id: authMembership.id },
      data: {
        points: (authMembership.points || 0) + (walkinMembership.points || 0),
        totalPointsEarned: mergedTotalPointsEarned,
        tier: computeMembershipTier(mergedTotalPointsEarned),
      },
    });

    await tx.membership.delete({ where: { id: walkinMembership.id } });
  }

  await tx.user.update({
    where: { id: walkinUser.id },
    data: { mergedIntoUserId: authUser.id, phone: null },
  });
}

async function main() {
  const lineUsers = await prisma.user.findMany({
    where: { lineUserId: { not: null }, phone: { not: null }, mergedIntoUserId: null },
    select: { id: true, displayName: true, phone: true, lineUserId: true },
  });

  const report = [];

  for (const authUser of lineUsers) {
    const walkinCandidates = await prisma.user.findMany({
      where: {
        phone: authUser.phone,
        lineUserId: null,
        mergedIntoUserId: null,
        id: { not: authUser.id },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (walkinCandidates.length === 0) continue;

    for (const walkinUser of walkinCandidates) {
      const memberships = await prisma.membership.findMany({
        where: { userId: walkinUser.id },
        select: { tenantId: true, points: true, totalPointsEarned: true, tier: true },
      });

      report.push({
        authUserId: authUser.id,
        authUserName: authUser.displayName,
        phone: authUser.phone,
        walkinUserId: walkinUser.id,
        walkinUserName: walkinUser.displayName,
        walkinMemberships: memberships,
      });

      if (APPLY) {
        await prisma.$transaction((tx) => mergeCandidate(tx, authUser, walkinUser));
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${report.length} candidate merge(s) found.`);
  console.log(APPLY ? 'Applied.' : 'Dry run only — re-run with --apply to perform the merge.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
