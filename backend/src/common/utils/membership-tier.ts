export function computeMembershipTier(totalPointsEarned: number): string {
  if (totalPointsEarned >= 1000) return 'Platinum';
  if (totalPointsEarned >= 500) return 'Gold';
  if (totalPointsEarned >= 100) return 'Silver';
  return 'Bronze';
}
